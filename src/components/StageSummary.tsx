import { taskStage } from '../lib/storage'
import { stages } from '../types'
import type { Task } from '../types'

export function StageSummary({ tasks }: { tasks: Task[] }) {
  return (
    <div className="tf-summary" aria-live="polite">
      {stages.map((stage, index) => (
        <span key={stage} data-stage={index}>
          {tasks.filter((task) => taskStage(task) === stage).length} {stage}
        </span>
      ))}
    </div>
  )
}
