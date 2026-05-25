export function routeToLabel(route: string): string {
  if (route === '/') return 'Home';
  return route
    .split('/')
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' / ');
}

export function routeLastSegmentLabel(route: string): string {
  const seg = route.split('/').filter(Boolean).pop() ?? '';
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}
