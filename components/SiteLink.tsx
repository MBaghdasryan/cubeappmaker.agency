import type { ComponentPropsWithoutRef } from 'react';

// Vinext's production client navigation currently fails while resolving its
// navigation runtime. Native anchors preserve working routes, hash scrolling,
// keyboard navigation, modifier clicks and no-JavaScript navigation.
export default function SiteLink(props: ComponentPropsWithoutRef<'a'>) {
  return <a {...props} />;
}
