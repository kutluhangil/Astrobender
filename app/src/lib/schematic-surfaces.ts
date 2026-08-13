export const DEFAULT_SCHEMATIC_SURFACES_VISIBLE = false

export interface SchematicSurface {
  visible: boolean
}

export function applySchematicSurfaceVisibility(
  surfaces: Iterable<SchematicSurface>,
  visible: boolean,
) {
  for (const surface of surfaces) surface.visible = visible
}
