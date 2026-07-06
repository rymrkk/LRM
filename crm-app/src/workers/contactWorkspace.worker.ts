import {
  createWorkspaceEngine,
  type WorkspaceEngine,
  type WorkspaceWorkerInboundMessage,
  type WorkspaceWorkerOutboundMessage,
} from '../lib/data/workspace-engine'

let engine: WorkspaceEngine | null = null

function post(message: WorkspaceWorkerOutboundMessage) {
  self.postMessage(message)
}

self.onmessage = (event: MessageEvent<WorkspaceWorkerInboundMessage>) => {
  try {
    if (event.data.type === 'init') {
      engine = createWorkspaceEngine(event.data.contacts)
      post({
        filterOptions: engine.filterOptions,
        locationIndex: engine.locationIndex,
        totalCount: engine.totalCount,
        type: 'ready',
        workspaceId: event.data.workspaceId,
      })
      return
    }

    if (!engine) {
      post({
        message: 'Contact workspace worker has not been initialized.',
        requestId: event.data.requestId,
        type: 'error',
      })
      return
    }

    post({
      ...engine.query({
        filters: event.data.filters,
        includeCompanies: event.data.activeView === 'companies',
        searchQuery: event.data.searchQuery,
      }),
      requestId: event.data.requestId,
      type: 'result',
    })
  } catch (error) {
    post({
      message: error instanceof Error ? error.message : 'Contact workspace worker failed.',
      requestId: event.data.type === 'query' ? event.data.requestId : undefined,
      type: 'error',
    })
  }
}
