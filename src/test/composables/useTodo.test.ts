import { describe, it, expect, beforeEach } from 'vitest'
import { useTodo } from '../../composables/useTodo'

describe('useTodo', () => {
  const { todos, addTodo, removeTodo, updateTodoStatus, updateTodos } = useTodo()

  beforeEach(() => {
    updateTodos([])
  })

  it('应该能添加任务', () => {
    addTodo({
      content: '测试任务',
      status: 'pending',
      priority: 'medium'
    })
    expect(todos.value.length).toBe(1)
    expect(todos.value[0].content).toBe('测试任务')
  })

  it('应该能删除任务', () => {
    addTodo({
      content: '要删除的任务',
      status: 'pending',
      priority: 'medium'
    })
    const id = todos.value[0].id
    removeTodo(id)
    expect(todos.value.length).toBe(0)
  })

  it('应该能更新任务状态', () => {
    addTodo({
      content: '状态更新任务',
      status: 'pending',
      priority: 'medium'
    })
    const id = todos.value[0].id
    updateTodoStatus(id, 'completed')
    expect(todos.value[0].status).toBe('completed')
  })

  it('应该能全量更新任务', () => {
    const newTodos = [
      { id: '1', content: '任务1', status: 'pending', priority: 'high' },
      { id: '2', content: '任务2', status: 'completed', priority: 'low' }
    ] as any
    updateTodos(newTodos)
    expect(todos.value.length).toBe(2)
    expect(todos.value[0].id).toBe('1')
  })
})
