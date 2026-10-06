export function getEntryOffset(
  targetX: number,
  targetY: number,
  stageWidth: number,
  stageHeight: number,
  margin: number,
  directionDeg: number,
) {
  const radians = directionDeg * Math.PI / 180
  const dx = Math.cos(radians)
  const dy = Math.sin(radians)
  const distances = [
    dx > 0.0001 ? (targetX + margin) / dx : Infinity,
    dx < -0.0001 ? (stageWidth - targetX + margin) / -dx : Infinity,
    dy > 0.0001 ? (targetY + margin) / dy : Infinity,
    dy < -0.0001 ? (stageHeight - targetY + margin) / -dy : Infinity,
  ]
  const distance = Math.min(...distances)
  return { x: -dx * distance, y: -dy * distance }
}
