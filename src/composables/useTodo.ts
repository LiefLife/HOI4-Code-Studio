import { ref } from 'vue'

/**
 * Todo 任务项接口
 */
export interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
}

const todos = ref<TodoItem[]>([])

/**
 * 管理 Todo 列表的 Composable
 */
export function useTodo() {
  /**
   * 更新 Todo 列表
   * @param newTodos 新的 Todo 列表
   */
  function updateTodos(newTodos: TodoItem[]) {
    todos.value = newTodos
  }

  /**
   * 添加 Todo
   * @param todo Todo 项
   */
  function addTodo(todo: Omit<TodoItem, 'id'>) {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    todos.value.push({ ...todo, id })
  }

  /**
   * 删除 Todo
   * @param id Todo ID
   */
  function removeTodo(id: string) {
    const index = todos.value.findIndex(t => t.id === id)
    if (index !== -1) {
      todos.value.splice(index, 1)
    }
  }

  /**
   * 更新 Todo 状态
   * @param id Todo ID
   * @param status 新状态
   */
  function updateTodoStatus(id: string, status: TodoItem['status']) {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.status = status
    }
  }

  return {
    todos,
    updateTodos,
    addTodo,
    removeTodo,
    updateTodoStatus
  }
}
