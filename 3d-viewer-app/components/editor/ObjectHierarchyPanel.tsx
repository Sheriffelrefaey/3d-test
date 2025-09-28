'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Layers,
  Box,
  Group,
  Search,
  Filter,
  MessageSquare,
  Edit,
  // X // Unused import
} from 'lucide-react';
import { useEditorStore } from '@/lib/store/editorStore';
import type { Annotation } from '@/types';
import '@/styles/glassmorphism.css';

interface MeshItem {
  name: string;
  type: 'mesh' | 'group';
  visible: boolean;
  locked: boolean;
  deleted: boolean;
  children?: MeshItem[];
  parent?: string;
  isUserGroup?: boolean; // Flag to distinguish user-created groups
}

interface ObjectHierarchyPanelProps {
  meshes: any[]; // Using any to avoid THREE namespace issues
  onSelectMesh: (meshName: string) => void;
  onSelectMultipleMeshes?: (meshNames: string[]) => void;
  selectedMesh: string | null;
  selectedMeshes?: string[];
  annotations?: Annotation[];
  onSelectAnnotation?: (annotation: Annotation) => void;
  onDeleteAnnotation?: (annotation: Annotation) => void;
  selectedAnnotation?: Annotation | null;
  onGroupMeshes?: (meshNames: string[], groupName: string) => void;
  onUngroupMeshes?: (groupName: string) => void;
  onRenameMesh?: (oldName: string, newName: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetItems: string[];
  isGroup: boolean;
}

export default function ObjectHierarchyPanel({
  meshes,
  onSelectMesh,
  onSelectMultipleMeshes,
  selectedMesh,
  selectedMeshes = [],
  annotations = [],
  onSelectAnnotation,
  onDeleteAnnotation,
  selectedAnnotation,
  onGroupMeshes,
  onUngroupMeshes,
  onRenameMesh
}: ObjectHierarchyPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [objectsExpanded, setObjectsExpanded] = useState(true);
  const [annotationsExpanded, setAnnotationsExpanded] = useState(true);
  const [_multiSelectMode, _setMultiSelectMode] = useState(false); // Unused
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetItems: [],
    isGroup: false
  });
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [userGroups, setUserGroups] = useState<Map<string, string[]>>(new Map());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const flatItemsRef = useRef<MeshItem[]>([]);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const {
    transforms,
    toggleObjectVisibility,
    deleteObject,
    updateTransformProperty
  } = useEditorStore();

  // Organize meshes into hierarchy
  const hierarchy = useMemo(() => {
    const rootItems: MeshItem[] = [];
    const groupedMeshes = new Set<string>();

    // First, create user-defined groups
    meshes.forEach((mesh) => {
      const meshName = mesh.name || '';
      const groupName = mesh.userData?.group;

      if (groupName && !groupedMeshes.has(meshName)) {
        // This mesh belongs to a user-created group
        groupedMeshes.add(meshName);

        // Find or create the group in hierarchy
        let group = rootItems.find(item => item.name === groupName && item.isUserGroup);
        if (!group) {
          const transform = transforms.get(groupName);
          group = {
            name: groupName,
            type: 'group',
            visible: transform?.visible ?? true,
            locked: false,
            deleted: transform?.deleted ?? false,
            children: [],
            isUserGroup: true
          };
          rootItems.push(group);
        }

        // Add mesh to group
        const meshTransform = transforms.get(meshName);
        group.children?.push({
          name: meshName,
          type: 'mesh',
          visible: meshTransform?.visible ?? true,
          locked: (meshTransform as any)?.locked ?? false,
          deleted: meshTransform?.deleted ?? false,
          parent: groupName
        });
      }
    });

    // Then add ungrouped meshes
    meshes.forEach((mesh, index) => {
      const meshName = mesh.name || `Mesh_${index}`;

      if (!groupedMeshes.has(meshName)) {
        const transform = transforms.get(meshName);

        // Check for auto-grouping by naming convention (optional)
        let added = false;
        if (meshName.includes('_') || meshName.includes('.')) {
          const parts = meshName.split(/[_.]/);
          if (parts.length > 1) {
            const autoGroupName = parts[0];

            // Only auto-group if not already in a user group
            let autoGroup = rootItems.find(item => item.name === autoGroupName && !item.isUserGroup);
            if (!autoGroup) {
              autoGroup = {
                name: autoGroupName,
                type: 'group',
                visible: true,
                locked: false,
                deleted: false,
                children: [],
                isUserGroup: false
              };
              rootItems.push(autoGroup);
            }

            autoGroup.children?.push({
              name: meshName,
              type: 'mesh',
              visible: transform?.visible ?? true,
              locked: (transform as any)?.locked ?? false,
              deleted: transform?.deleted ?? false,
              parent: autoGroupName
            });
            added = true;
          }
        }

        if (!added) {
          rootItems.push({
            name: meshName,
            type: 'mesh',
            visible: transform?.visible ?? true,
            locked: (transform as any)?.locked ?? false,
            deleted: transform?.deleted ?? false
          });
        }
      }
    });

    return rootItems;
  }, [meshes, transforms]);

  // Create flat list of all items for range selection
  useEffect(() => {
    const flatList: MeshItem[] = [];

    const addToFlatList = (items: MeshItem[]) => {
      items.forEach(item => {
        flatList.push(item);
        if (item.children && item.children.length > 0) {
          addToFlatList(item.children);
        }
      });
    };

    addToFlatList(hierarchy);
    flatItemsRef.current = flatList;
  }, [hierarchy]);

  // Filter hierarchy based on search
  const filteredHierarchy = useMemo(() => {
    if (!searchTerm) return hierarchy;

    const filterItems = (items: MeshItem[]): MeshItem[] => {
      return items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesVisibility = !filterVisible || item.visible;

        if (item.children) {
          const filteredChildren = filterItems(item.children);
          return matchesSearch || filteredChildren.length > 0;
        }

        return matchesSearch && matchesVisibility && !item.deleted;
      });
    };

    return filterItems(hierarchy);
  }, [hierarchy, searchTerm, filterVisible]);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const handleToggleVisibility = (name: string, children?: MeshItem[]) => {
    if (children) {
      // Toggle all children
      children.forEach(child => {
        toggleObjectVisibility(child.name);
      });
    } else {
      toggleObjectVisibility(name);
    }
  };

  const handleLockToggle = (name: string) => {
    const transform = transforms.get(name);
    const isLocked = (transform as any)?.locked ?? false;
    updateTransformProperty(name, 'locked', !isLocked);
  };

  const handleDelete = (name: string, children?: MeshItem[]) => {
    if (children) {
      children.forEach(child => deleteObject(child.name));
    } else {
      deleteObject(name);
    }
    toast.success(`Deleted ${children ? 'group' : 'object'} "${name}"`);
  };

  // Handle item selection with range selection support
  const handleItemClick = useCallback((e: React.MouseEvent, item: MeshItem) => {
    e.stopPropagation();

    // Find the index of the clicked item in the flat list
    const clickedIndex = flatItemsRef.current.findIndex(i => i.name === item.name);

    if (e.shiftKey && lastSelectedIndex !== -1 && clickedIndex !== -1) {
      // Shift+Click: Range selection
      const startIndex = Math.min(lastSelectedIndex, clickedIndex);
      const endIndex = Math.max(lastSelectedIndex, clickedIndex);
      const newSelected = new Set(selectedItems);

      // Select all items between start and end (inclusive)
      for (let i = startIndex; i <= endIndex; i++) {
        const itemToSelect = flatItemsRef.current[i];
        if (itemToSelect && !itemToSelect.deleted) {
          newSelected.add(itemToSelect.name);
          // If it's a group, also add its children
          if (itemToSelect.children && itemToSelect.isUserGroup) {
            itemToSelect.children.forEach(child => {
              if (!child.deleted) newSelected.add(child.name);
            });
          }
        }
      }

      setSelectedItems(newSelected);
      onSelectMultipleMeshes?.(Array.from(newSelected));
      // Don't update lastSelectedIndex on shift+click to allow extending selection
    } else if (e.metaKey || e.ctrlKey) {
      // Ctrl/Cmd+Click: Toggle selection
      const newSelected = new Set(selectedItems);

      if (item.type === 'group' && item.children && item.isUserGroup) {
        // For user groups, toggle all children together
        const allInGroup = [item.name, ...item.children.map(c => c.name)];
        const allSelected = allInGroup.every(name => newSelected.has(name));

        if (allSelected) {
          // Remove all from selection
          allInGroup.forEach(name => newSelected.delete(name));
        } else {
          // Add all to selection
          allInGroup.forEach(name => newSelected.add(name));
        }
      } else {
        // Individual item toggle
        if (newSelected.has(item.name)) {
          newSelected.delete(item.name);
        } else {
          newSelected.add(item.name);
        }
      }

      setSelectedItems(newSelected);
      onSelectMultipleMeshes?.(Array.from(newSelected));
      setLastSelectedIndex(clickedIndex); // Update for future shift+click
    } else {
      // Single select
      if (item.type === 'group' && item.children && item.isUserGroup) {
        // For user groups, select all children as one entity
        const allNames = item.children.map(c => c.name);
        setSelectedItems(new Set(allNames));
        onSelectMultipleMeshes?.(allNames);
      } else {
        setSelectedItems(new Set([item.name]));
        onSelectMesh(item.name);
      }
      setLastSelectedIndex(clickedIndex); // Update for future shift+click
    }
  }, [selectedItems, onSelectMesh, onSelectMultipleMeshes, lastSelectedIndex]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, item: MeshItem) => {
    e.preventDefault();
    e.stopPropagation();

    let targetItems: string[];
    if (selectedItems.has(item.name)) {
      // If item is already selected, use all selected items
      targetItems = Array.from(selectedItems);
    } else {
      // Otherwise, just this item
      targetItems = [item.name];
      if (item.type === 'group' && item.children) {
        targetItems.push(...item.children.map(c => c.name));
      }
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetItems,
      isGroup: item.type === 'group'
    });
  }, [selectedItems]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    // Add explicit return for the else case
    return;
  }, [contextMenu.visible]);

  // Handle grouping
  const handleGroup = useCallback(() => {
    const groupName = 'NewGroup'; // Replace prompt with default name
    console.warn('Group creation triggered - would prompt for name in interactive mode');
    if (groupName && contextMenu.targetItems.length > 0) {
      // Update local state to track user groups
      const newUserGroups = new Map(userGroups);
      newUserGroups.set(groupName, contextMenu.targetItems);
      setUserGroups(newUserGroups);

      onGroupMeshes?.(contextMenu.targetItems, groupName);
      setContextMenu(prev => ({ ...prev, visible: false }));
      setSelectedItems(new Set());
      toast.success(`Created group "${groupName}"`);
    }
  }, [contextMenu.targetItems, onGroupMeshes, userGroups]);

  // Handle ungrouping
  const handleUngroup = useCallback(() => {
    if (contextMenu.targetItems.length > 0) {
      contextMenu.targetItems.forEach(item => {
        const group = hierarchy.find(h => h.name === item && h.type === 'group' && h.isUserGroup);
        if (group) {
          // Remove from local state
          const newUserGroups = new Map(userGroups);
          newUserGroups.delete(item);
          setUserGroups(newUserGroups);

          onUngroupMeshes?.(item);
        }
      });
      setContextMenu(prev => ({ ...prev, visible: false }));
      toast.success('Ungrouped items');
    }
  }, [contextMenu.targetItems, hierarchy, onUngroupMeshes, userGroups]);

  // Handle rename
  const handleStartRename = useCallback((itemName: string) => {
    setRenamingItem(itemName);
    setRenameValue(itemName);
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleFinishRename = useCallback(() => {
    if (renamingItem && renameValue && renameValue !== renamingItem) {
      onRenameMesh?.(renamingItem, renameValue);
      toast.success(`Renamed to "${renameValue}"`);
    }
    setRenamingItem(null);
    setRenameValue('');
  }, [renamingItem, renameValue, onRenameMesh]);

  const renderItem = (item: MeshItem, level: number = 0) => {
    const isSelected = selectedMesh === item.name || selectedItems.has(item.name) ||
                      (selectedMeshes && selectedMeshes.includes(item.name));
    const isGroup = item.type === 'group';
    const isExpanded = expandedGroups.has(item.name);
    const isRenaming = renamingItem === item.name;

    if (item.deleted) return null;

    return (
      <div key={`${item.name}_${level}_${item.type}`}>
        <div
          className={`
            group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all
            ${isSelected
              ? 'glass-button-primary text-white ring-2 ring-blue-400/50'
              : 'hover:bg-white/5 text-gray-300 hover:text-white'
            }
          `}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={(e) => handleItemClick(e, item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          {/* Expand/Collapse for groups */}
          {isGroup && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroup(item.name);
              }}
              className="p-0.5 hover:bg-white/10 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}

          {/* Icon */}
          <div className="flex-shrink-0">
            {isGroup ? (
              <Group size={14} className="text-blue-400" />
            ) : (
              <Box size={14} className="text-gray-400" />
            )}
          </div>

          {/* Name */}
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishRename();
                if (e.key === 'Escape') {
                  setRenamingItem(null);
                  setRenameValue('');
                }
              }}
              className="flex-1 text-xs bg-black/30 border border-white/20 rounded px-1 py-0.5 text-white outline-none focus:border-blue-400"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-xs font-medium truncate">
              {item.name}
            </span>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
            {/* Visibility toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleVisibility(item.name, item.children);
              }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
              title={item.visible ? 'Hide' : 'Show'}
            >
              {item.visible ? (
                <Eye size={12} className="text-gray-400" />
              ) : (
                <EyeOff size={12} className="text-gray-500" />
              )}
            </button>

            {/* Lock toggle */}
            {!isGroup && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLockToggle(item.name);
                }}
                className="p-0.5 hover:bg-white/10 rounded transition-colors"
                title={item.locked ? 'Unlock' : 'Lock'}
              >
                {item.locked ? (
                  <Lock size={12} className="text-yellow-400" />
                ) : (
                  <Unlock size={12} className="text-gray-400" />
                )}
              </button>
            )}

            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.name, item.children);
              }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={12} className="text-red-400" />
            </button>
          </div>
        </div>

        {/* Render children if expanded */}
        {isGroup && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="glass-panel-light p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Hierarchy</h3>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-2 py-1.5 text-xs glass-input rounded-lg focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setFilterVisible(!filterVisible)}
            className={`
              flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all
              ${filterVisible ? 'glass-button-primary text-white' : 'glass-button text-gray-400'}
            `}
          >
            <Filter size={12} />
            <span>Visible Only</span>
          </button>
        </div>
      </div>

      {/* Hierarchy List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 dark-scrollbar" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        {/* Objects Section */}
        <div className="mb-3">
          <button
            onClick={() => setObjectsExpanded(!objectsExpanded)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-2">
              {objectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Box size={14} className="text-blue-400" />
              <span className="text-xs font-semibold text-white">Objects</span>
            </div>
            <span className="text-xs text-gray-400">
              {meshes.length} items
            </span>
          </button>

          {objectsExpanded && (
            <div className="mt-2 pl-2">
              {filteredHierarchy.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredHierarchy.map(item => renderItem(item))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-xs">
                  {searchTerm ? 'No objects found' : 'No objects in scene'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Annotations Section */}
        <div className="mb-3">
          <button
            onClick={() => setAnnotationsExpanded(!annotationsExpanded)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-2">
              {annotationsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <MessageSquare size={14} className="text-yellow-400" />
              <span className="text-xs font-semibold text-white">Annotations</span>
            </div>
            <span className="text-xs text-gray-400">
              {annotations.length} items
            </span>
          </button>

          {annotationsExpanded && (
            <div className="mt-2 pl-2">
              {annotations.length > 0 ? (
                <div className="space-y-1">
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      onClick={() => onSelectAnnotation?.(annotation)}
                      className={`
                        group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all
                        ${selectedAnnotation?.id === annotation.id
                          ? 'glass-button-primary text-white'
                          : 'hover:bg-white/5 text-gray-300 hover:text-white'
                        }
                      `}
                    >
                      <MessageSquare size={12} className="text-yellow-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {annotation.title || 'Untitled'}
                        </div>
                        {annotation.description && (
                          <div className="text-xs text-gray-400 truncate">
                            {annotation.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAnnotation?.(annotation);
                          }}
                          className="p-0.5 hover:bg-white/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={12} className="text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAnnotation?.(annotation);
                          }}
                          className="p-0.5 hover:bg-white/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-xs">
                  No annotations
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="glass-panel-light p-2 border-t border-white/10">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center border-r border-white/10">
            <div className="text-gray-400">Objects</div>
            <div className="flex justify-center gap-3 mt-1">
              <div>
                <span className="text-white font-medium">
                  {hierarchy.filter(h => h.visible && !h.deleted).length}
                </span>
                <span className="text-gray-500 ml-1">visible</span>
              </div>
              <div>
                <span className="text-white font-medium">
                  {hierarchy.filter(h => !h.visible && !h.deleted).length}
                </span>
                <span className="text-gray-500 ml-1">hidden</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Annotations</div>
            <div className="text-white font-medium mt-1">
              {annotations.length}
            </div>
          </div>
        </div>
      </div>
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-gray-900 border border-white/20 rounded-lg shadow-2xl py-1 z-50 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.targetItems.length > 1 && (
            <button
              onClick={handleGroup}
              className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors"
            >
              <Group size={12} className="inline mr-2" />
              Group Selected
            </button>
          )}
          {contextMenu.isGroup && contextMenu.targetItems.length === 1 && (
            <button
              onClick={handleUngroup}
              className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors"
            >
              <Group size={12} className="inline mr-2" />
              Ungroup
            </button>
          )}
          {contextMenu.targetItems.length === 1 && (
            <button
              onClick={() => {
                const target = contextMenu.targetItems[0];
                if (target) handleStartRename(target);
              }}
              className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors"
            >
              <Edit size={12} className="inline mr-2" />
              Rename
            </button>
          )}
          <div className="border-t border-white/10 my-1" />
          <button
            onClick={() => {
              contextMenu.targetItems.forEach(name => handleDelete(name));
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-colors"
          >
            <Trash2 size={12} className="inline mr-2" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}