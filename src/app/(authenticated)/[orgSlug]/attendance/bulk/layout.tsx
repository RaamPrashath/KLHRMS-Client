// Import react-big-calendar base styles once at the route level.
// These are plain CSS files from node_modules — Next.js handles them
// correctly when imported in a layout (server component).
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

export default function BulkAttendanceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
