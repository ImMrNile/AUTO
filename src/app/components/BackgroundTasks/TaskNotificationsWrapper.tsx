'use client';

import { useTaskContext } from './TaskProvider';
import TaskNotificationsGlobal from './TaskNotificationsGlobal';

export default function TaskNotificationsWrapper() {
  const { refreshTrigger } = useTaskContext();
  
  return <TaskNotificationsGlobal refreshTrigger={refreshTrigger} />;
}
