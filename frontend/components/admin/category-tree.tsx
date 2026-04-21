"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Folder, FolderOpen, Tag } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"
import { getRawCategories, type CategoryRaw } from "@/services/admin/categories"

type TreeNode = {
  id: number
  name: string
  children: TreeNode[]
}

function buildTree(items: CategoryRaw[]): TreeNode[] {
  const nodeMap = new Map<number, TreeNode>()
  items.forEach((item) => {
    nodeMap.set(item.id, { id: item.id, name: item.name, children: [] })
  })

  const roots: TreeNode[] = []
  items.forEach((item) => {
    const node = nodeMap.get(item.id)!
    if (item.parentId === null) {
      roots.push(node)
    } else {
      const parent = nodeMap.get(item.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }
  })

  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach((node) => sortNodes(node.children))
    return nodes
  }

  return sortNodes(roots)
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0
  )
}

type TreeNodeRowProps = {
  node: TreeNode
  depth: number
}

function TreeNodeRow({ node, depth }: TreeNodeRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children.length > 0
  const total = useMemo(() => countDescendants(node), [node])

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 ${
          hasChildren ? "cursor-pointer" : "cursor-default"
        }`}
        style={{ paddingLeft: `${(depth * 16) + 8}px` }}
        onClick={() => hasChildren && setExpanded((prev) => !prev)}
      >
        {hasChildren ? (
          <ChevronRight
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        ) : (
          <span className="size-3.5 shrink-0" />
        )}

        {hasChildren ? (
          expanded ? (
            <FolderOpen className="size-4 shrink-0 text-amber-500" />
          ) : (
            <Folder className="size-4 shrink-0 text-amber-500" />
          )
        ) : (
          <Tag className="size-3.5 shrink-0 text-muted-foreground" />
        )}

        <span className="flex-1 truncate font-medium">{node.name}</span>

        {total > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {total}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoryTree() {
  const [items, setItems] = useState<CategoryRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getRawCategories()
        setItems(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load categories"
        )
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const tree = useMemo(() => buildTree(items), [items])

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Category Tree</h2>
        <span className="text-xs text-muted-foreground">{items.length} total</span>
      </div>

      <div className="max-h-96 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Spinner className="size-4" />
            <span className="text-sm">Loading tree...</span>
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : tree.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No categories found
          </p>
        ) : (
          tree.map((node) => (
            <TreeNodeRow
              key={node.id}
              node={node}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  )
}
