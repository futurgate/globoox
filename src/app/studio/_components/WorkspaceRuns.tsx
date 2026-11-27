'use client';

import { useState } from 'react';
import type { WorkspaceData } from '@/lib/translationWorkspaceTypes';
import { ProjectRunHistory } from './ProjectRunHistory';
import WorkspaceActivity from './WorkspaceActivity';

export function WorkspaceRuns({ workspace }: { workspace: WorkspaceData }) {
  const [showActivity,setShowActivity] = useState(false);
  const admin = workspace.role === 'admin';
  return <div className="pt-stack">
    <ProjectRunHistory admin={admin}/>
    {admin && <details onToggle={event => setShowActivity(event.currentTarget.open)}>
      <summary>Техническая очередь</summary>
      {showActivity && <div className="mt-3"><WorkspaceActivity view="queue" workspace={workspace}/></div>}
    </details>}
  </div>;
}
