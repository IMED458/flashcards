import React, { useState, useRef, useEffect } from 'react';
import { MindNode } from '../../lib/engine/types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Sparkles,
  Info
} from 'lucide-react';

interface MindMapModuleProps {
  initialMindmap: MindNode;
  onNavigateToNotesSection?: (sectionId?: string) => void;
}

interface FlattenedNode {
  id: string;
  label: string;
  fullText?: string;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isExpanded: boolean;
  hasChildren: boolean;
  childrenIds: string[];
  parentId?: string;
  facts?: string[];
  sectionId?: string;
}

export const MindMapModule: React.FC<MindMapModuleProps> = ({
  initialMindmap,
  onNavigateToNotesSection
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform and state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 80, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Node expansion state (default: root + level 1 expanded)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<FlattenedNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Expand level 1 by default on load
  useEffect(() => {
    const defaultExpanded = new Set<string>(['root']);
    initialMindmap.children.forEach(c => defaultExpanded.add(c.id));
    setExpandedNodeIds(defaultExpanded);
  }, [initialMindmap]);

  // Layout calculation
  const calculateLayout = (): { nodes: FlattenedNode[]; links: { from: FlattenedNode; to: FlattenedNode }[] } => {
    const flatNodes: FlattenedNode[] = [];
    const flatLinks: { from: FlattenedNode; to: FlattenedNode }[] = [];

    let currentY = 50;
    const LEVEL_X_GAP = 240;
    const NODE_Y_GAP = 55;

    function traverse(node: MindNode, level: number, parent?: FlattenedNode): FlattenedNode {
      const isExpanded = expandedNodeIds.has(node.id);
      const hasChildren = Boolean(node.children && node.children.length > 0);

      const width = Math.min(220, Math.max(100, node.label.length * 9 + 30));
      const height = 38;

      const fNode: FlattenedNode = {
        id: node.id,
        label: node.label,
        fullText: node.fullText || node.label,
        level,
        x: level * LEVEL_X_GAP,
        y: currentY,
        width,
        height,
        isExpanded,
        hasChildren,
        childrenIds: node.children ? node.children.map(c => c.id) : [],
        parentId: parent?.id,
        facts: node.facts,
        sectionId: node.sectionId
      };

      if (hasChildren && isExpanded) {
        const childNodes: FlattenedNode[] = [];
        node.children.forEach((c) => {
          childNodes.push(traverse(c, level + 1, fNode));
        });
        // Center parent vertically with respect to children
        if (childNodes.length > 0) {
          const firstChildY = childNodes[0].y;
          const lastChildY = childNodes[childNodes.length - 1].y;
          fNode.y = (firstChildY + lastChildY) / 2;
        }
      } else {
        currentY += NODE_Y_GAP;
      }

      flatNodes.push(fNode);
      if (parent) {
        flatLinks.push({ from: parent, to: fNode });
      }

      return fNode;
    }

    traverse(initialMindmap, 0);
    return { nodes: flatNodes, links: flatLinks };
  };

  const { nodes, links } = calculateLayout();

  // Mouse panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on background canvas
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'mindmap-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setScale(s => Math.min(2.0, Math.max(0.4, s + delta)));
  };

  const handleFit = () => {
    setScale(0.9);
    setTranslate({ x: 60, y: 120 });
  };

  const handleToggleNode = (node: FlattenedNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedNodeIds);
    if (next.has(node.id)) next.delete(node.id);
    else next.add(node.id);
    setExpandedNodeIds(next);
  };

  const handleSelectNode = (node: FlattenedNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  // Export SVG
  const handleExportSVG = () => {
    const svgElem = document.getElementById('mindmap-svg');
    if (!svgElem) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElem);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ცოდნის_რუკა.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 overflow-hidden select-none border border-slate-200 dark:border-slate-800 rounded-2xl">
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ძიება რუკაში..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-2 py-1 w-36 sm:w-48 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
        <button
          onClick={() => handleZoom(0.15)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="გადიდება (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-0.15)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="დაპატარავება (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFit}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="ცენტრირება"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleExportSVG}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="SVG ექსპორტი"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Helper Pill */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 pointer-events-none">
        დააჭირეთ და გადაათრიეთ ნავიგაციისთვის · დაკლიკებით იშლება
      </div>

      {/* Main Canvas Area */}
      <div
        id="mindmap-bg"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <svg
          id="mindmap-svg"
          className="w-full h-full"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* Bezier Connectors */}
          <g>
            {links.map((link, idx) => {
              const x1 = link.from.x + link.from.width;
              const y1 = link.from.y + link.from.height / 2;
              const x2 = link.to.x;
              const y2 = link.to.y + link.to.height / 2;

              const dx = (x2 - x1) * 0.5;
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              const strokeColor = link.to.level === 1 ? '#6366F1' : link.to.level === 2 ? '#3B82F6' : '#94A3B8';

              return (
                <path
                  key={idx}
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={link.to.level === 1 ? 2.2 : 1.5}
                  strokeOpacity={0.65}
                />
              );
            })}
          </g>

          {/* Interactive Nodes */}
          <g>
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isMatch = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());

              const isRoot = node.level === 0;
              const isLevel1 = node.level === 1;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => handleSelectNode(node, e)}
                  className="cursor-pointer group"
                >
                  {/* Node Rectangle */}
                  <rect
                    width={node.width}
                    height={node.height}
                    rx={isRoot ? 12 : 8}
                    className={`transition-all duration-150 ${
                      isSelected
                        ? 'fill-indigo-600 stroke-indigo-600 stroke-2 text-white'
                        : isMatch
                        ? 'fill-amber-100 dark:fill-amber-950 stroke-amber-500 stroke-2'
                        : isRoot
                        ? 'fill-indigo-50 dark:fill-indigo-950 stroke-indigo-500 stroke-1.5'
                        : isLevel1
                        ? 'fill-white dark:fill-slate-900 stroke-indigo-400 dark:stroke-indigo-600 stroke-1'
                        : 'fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-700 stroke-1'
                    }`}
                  />

                  {/* Node Label Text */}
                  <text
                    x={12}
                    y={node.height / 2 + 4}
                    fontSize={isRoot ? 13 : isLevel1 ? 12 : 11}
                    fontWeight={isRoot || isLevel1 ? 'bold' : 'normal'}
                    className={`${
                      isSelected
                        ? 'fill-white'
                        : isRoot
                        ? 'fill-indigo-950 dark:fill-indigo-200'
                        : 'fill-slate-800 dark:fill-slate-200'
                    }`}
                  >
                    {node.label}
                  </text>

                  {/* Expand / Collapse toggle button */}
                  {node.hasChildren && (
                    <g
                      transform={`translate(${node.width - 20}, ${node.height / 2 - 8})`}
                      onClick={(e) => handleToggleNode(node, e)}
                    >
                      <circle
                        cx={8}
                        cy={8}
                        r={8}
                        className="fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600 hover:fill-indigo-500 hover:stroke-indigo-500 group-hover:scale-105 transition-all"
                      />
                      <text
                        x={8}
                        y={11}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight="bold"
                        className="fill-slate-600 dark:fill-slate-300 pointer-events-none"
                      >
                        {node.isExpanded ? '−' : '+'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Side Details Drawer when a node is selected */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bottom-4 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 overflow-y-auto space-y-4 z-30 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              კვანძის დეტალები
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white leading-snug">
              {selectedNode.label}
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedNode.fullText}
            </p>
          </div>

          {selectedNode.facts && selectedNode.facts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 block">
                დაკავშირებული ფაქტები:
              </span>
              <div className="space-y-1.5">
                {selectedNode.facts.map((f, idx) => (
                  <p key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                    „{f}“
                  </p>
                ))}
              </div>
            </div>
          )}

          {selectedNode.sectionId && onNavigateToNotesSection && (
            <div className="pt-2">
              <button
                onClick={() => onNavigateToNotesSection(selectedNode.sectionId)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ნახე ჩანაწერების სექციაში</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
