import { forwardWorkspaceRequest, workspaceRoute } from '../../translation-workspace/access';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return workspaceRoute(request, session => forwardWorkspaceRequest(request, session));
}
