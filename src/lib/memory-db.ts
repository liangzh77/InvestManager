// 内存数据库，适用于 Vercel 无服务器环境
interface MemoryDB {
  projects: any[]
  transactions: any[]
  overview: any[]
  autoIncrement: {
    projects: number
    transactions: number
    overview: number
  }
}

// 全局内存存储
let memoryDB: MemoryDB = {
  projects: [],
  transactions: [],
  overview: [],
  autoIncrement: {
    projects: 1,
    transactions: 1,
    overview: 1
  }
}

// 初始化内存数据库
function initializeMemoryDB() {
  // 重置数据
  memoryDB = {
    projects: [],
    transactions: [],
    overview: [],
    autoIncrement: {
      projects: 1,
      transactions: 1,
      overview: 1
    }
  }

  // 插入默认的总览数据
  memoryDB.overview.push({
    id: 1,
    总金额: 100000,
    成本金额: 0,
    持仓金额: 0,
    盈亏金额: 0,
    盈亏率: 0,
    仓位: 0,
    更新时间: new Date().toISOString()
  })

  // 插入示例项目数据
  memoryDB.projects.push({
    id: 1,
    项目名称: '泡泡玛特',
    项目代号: '9992',
    交易类型: '做多',
    成本价: 1100,
    当前价: 1200,
    股数: 100,
    仓位: 12.0,
    成本金额: 110000,
    当前金额: 120000,
    盈亏金额: 10000,
    项目盈亏率: 9.09,
    总盈亏率: 10.0,
    状态: '进行',
    排序顺序: 0,
    创建时间: new Date().toISOString(),
    完成时间: null
  })

  memoryDB.projects.push({
    id: 2,
    项目名称: '安克创新',
    项目代号: '300866',
    交易类型: '做多',
    成本价: 850,
    当前价: 800,
    股数: 50,
    仓位: 4.0,
    成本金额: 42500,
    当前金额: 40000,
    盈亏金额: -2500,
    项目盈亏率: -5.88,
    总盈亏率: -2.5,
    状态: '进行',
    排序顺序: 1,
    创建时间: new Date().toISOString(),
    完成时间: null
  })

  // 插入示例交易数据
  memoryDB.transactions.push({
    id: 1,
    项目ID: 1,
    项目名称: '泡泡玛特',
    状态: '计划',
    交易名称: '第一手',
    交易类型: '做多',
    警告方向: '向上',
    距离: 8.33,
    交易价: 1300,
    股数: 80,
    仓位: 10.4,
    交易金额: 104000,
    排序顺序: 0,
    创建时间: new Date().toISOString(),
    交易时间: null
  })

  memoryDB.transactions.push({
    id: 2,
    项目ID: 2,
    项目名称: '安克创新',
    状态: '计划',
    交易名称: '止损',
    交易类型: '多头平仓',
    警告方向: '向下',
    距离: -6.25,
    交易价: 750,
    股数: 50,
    仓位: 3.75,
    交易金额: 37500,
    排序顺序: 0,
    创建时间: new Date().toISOString(),
    交易时间: null
  })

  memoryDB.autoIncrement.projects = 3
  memoryDB.autoIncrement.transactions = 3
  memoryDB.autoIncrement.overview = 2

  console.log('Memory database initialized with sample data')
}

// 模拟数据库操作的接口
export class MemoryDatabase {
  constructor() {
    initializeMemoryDB()
  }

  // 模拟 prepare 方法
  prepare(sql: string) {
    return {
      get: (...args: any[]) => {
        let params: any[] = []
        if (args.length === 1 && Array.isArray(args[0])) {
          params = args[0]
        } else {
          params = args
        }
        return this.executeQuery(sql, params, 'get')
      },
      all: (...args: any[]) => {
        let params: any[] = []
        if (args.length === 1 && Array.isArray(args[0])) {
          params = args[0]
        } else {
          params = args
        }
        return this.executeQuery(sql, params, 'all')
      },
      run: (...args: any[]) => {
        // 兼容多种调用方式
        let params: any[] = []
        if (args.length === 1 && Array.isArray(args[0])) {
          params = args[0]
        } else {
          params = args
        }
        return this.executeQuery(sql, params, 'run')
      }
    }
  }

  // 模拟 exec 方法
  exec(sql: string) {
    // 对于创建表等DDL语句，直接忽略
    console.log('Executing DDL (ignored in memory DB):', sql.substring(0, 50) + '...')
  }

  // 模拟 transaction 方法
  transaction(fn: () => void) {
    return () => {
      try {
        fn()
      } catch (error) {
        console.error('Transaction failed:', error)
        throw error
      }
    }
  }

  private executeQuery(sql: string, params: any[] = [], type: 'get' | 'all' | 'run') {
    const sqlLower = sql.toLowerCase().trim()

    // SELECT 查询
    if (sqlLower.startsWith('select')) {
      return this.handleSelect(sql, params, type)
    }

    // INSERT 查询
    if (sqlLower.startsWith('insert')) {
      return this.handleInsert(sql, params)
    }

    // UPDATE 查询
    if (sqlLower.startsWith('update')) {
      return this.handleUpdate(sql, params)
    }

    // DELETE 查询
    if (sqlLower.startsWith('delete')) {
      return this.handleDelete(sql, params)
    }

    return null
  }

  private handleSelect(sql: string, params: any[], type: 'get' | 'all' | 'run') {
    const sqlLower = sql.toLowerCase()

    // 总览查询
    if (sqlLower.includes('from overview')) {
      const data = memoryDB.overview
      if (sqlLower.includes('where id = 1') || sqlLower.includes('where id = ?')) {
        const item = data.find(item => item.id === 1)
        return type === 'all' ? (item ? [item] : []) : item || null
      }
      return type === 'all' ? data : data[0] || null
    }

    // 项目查询
    if (sqlLower.includes('from projects')) {
      let data = [...memoryDB.projects]

      // 处理 WHERE 条件
      if (sqlLower.includes('where id = ?') && params.length > 0) {
        data = data.filter(item => item.id === params[0])
      }

      // 处理 ORDER BY
      if (sqlLower.includes('order by 排序顺序')) {
        data.sort((a, b) => (a.排序顺序 || 0) - (b.排序顺序 || 0))
      }

      // 处理 COUNT 查询
      if (sqlLower.includes('count(*)')) {
        return { count: data.length }
      }

      // 处理 SELECT id FROM projects
      if (sqlLower.includes('select id from projects')) {
        return type === 'all' ? data.map(p => ({ id: p.id })) : data[0] ? { id: data[0].id } : null
      }

      return type === 'all' ? data : data[0] || null
    }

    // 交易查询
    if (sqlLower.includes('from transactions')) {
      let data = [...memoryDB.transactions]

      // 处理 WHERE 条件
      if (sqlLower.includes('where id = ?') && params.length > 0) {
        data = data.filter(item => item.id === params[0])
      }
      if (sqlLower.includes('where 项目id = ?') && params.length > 0) {
        data = data.filter(item => item.项目ID === params[0])
      }
      if (sqlLower.includes('and 状态 = \'进行\'')) {
        data = data.filter(item => item.状态 === '进行')
      }
      if (sqlLower.includes('and 状态 = \'计划\'')) {
        data = data.filter(item => item.状态 === '计划')
      }

      // 处理 ORDER BY
      if (sqlLower.includes('order by 排序顺序')) {
        data.sort((a, b) => (a.排序顺序 || 0) - (b.排序顺序 || 0))
      }

      // 处理 COUNT 查询
      if (sqlLower.includes('count(*)')) {
        return {
          交易总数: data.length,
          计划中交易: data.filter(t => t.状态 === '计划').length,
          已完成交易: data.filter(t => t.状态 === '完成').length
        }
      }

      return type === 'all' ? data : data[0] || null
    }

    return type === 'all' ? [] : null
  }

  private handleInsert(sql: string, params: any[]) {
    const sqlLower = sql.toLowerCase()

    if (sqlLower.includes('into projects')) {
      const newId = memoryDB.autoIncrement.projects++
      const newProject = {
        id: newId,
        项目名称: params[0] || '',
        项目代号: params[1] || '',
        交易类型: params[2] || '做多',
        当前价: params[3] || 0,
        成本价: 0,
        股数: 0,
        仓位: 0,
        成本金额: 0,
        当前金额: 0,
        盈亏金额: 0,
        项目盈亏率: 0,
        总盈亏率: 0,
        状态: params[4] || '进行',
        排序顺序: params[5] || 0,
        创建时间: new Date().toISOString(),
        完成时间: null
      }
      memoryDB.projects.push(newProject)
      return { lastInsertRowid: newId, changes: 1 }
    }

    if (sqlLower.includes('into transactions')) {
      const newId = memoryDB.autoIncrement.transactions++
      const newTransaction = {
        id: newId,
        项目ID: params[0] || null,
        项目名称: params[1] || '',
        状态: params[2] || '计划',
        交易名称: params[3] || '',
        交易类型: params[4] || '做多',
        警告方向: params[5] || '向上',
        距离: params[6] || 0,
        交易价: params[7] || 0,
        股数: params[8] || 0,
        仓位: params[9] || 0,
        交易金额: params[10] || 0,
        排序顺序: params[11] || 0,
        创建时间: new Date().toISOString(),
        交易时间: null
      }
      memoryDB.transactions.push(newTransaction)
      return { lastInsertRowid: newId, changes: 1 }
    }

    if (sqlLower.includes('into overview')) {
      const newId = memoryDB.autoIncrement.overview++
      const newOverview = {
        id: params[0] || newId,
        总金额: params[1] || 0,
        成本金额: params[2] || 0,
        持仓金额: params[3] || 0,
        盈亏金额: params[4] || 0,
        盈亏率: params[5] || 0,
        仓位: params[6] || 0,
        更新时间: new Date().toISOString()
      }

      // 如果是 INSERT OR REPLACE，先删除现有记录
      if (sqlLower.includes('insert or replace')) {
        const index = memoryDB.overview.findIndex(item => item.id === newOverview.id)
        if (index !== -1) {
          memoryDB.overview[index] = newOverview
        } else {
          memoryDB.overview.push(newOverview)
        }
      } else {
        memoryDB.overview.push(newOverview)
      }

      return { lastInsertRowid: newOverview.id, changes: 1 }
    }

    return { lastInsertRowid: 0, changes: 0 }
  }

  private handleUpdate(sql: string, params: any[]) {
    const sqlLower = sql.toLowerCase()

    if (sqlLower.includes('update projects')) {
      let updated = 0

      if (sqlLower.includes('where id = ?')) {
        const id = params[params.length - 1] // ID 通常是最后一个参数
        const index = memoryDB.projects.findIndex(item => item.id === id)

        if (index !== -1) {
          // 根据 SQL 更新相应字段
          const project = memoryDB.projects[index]

          // 这里是一个简化的更新逻辑，实际中需要解析 SQL 来确定要更新的字段
          if (sqlLower.includes('当前价')) {
            project.当前价 = params[0]
          }
          if (sqlLower.includes('项目名称')) {
            project.项目名称 = params[0]
          }
          if (sqlLower.includes('状态')) {
            project.状态 = params.find(p => p === '进行' || p === '完成') || project.状态
          }

          updated = 1
        }
      }

      return { changes: updated }
    }

    if (sqlLower.includes('update transactions')) {
      let updated = 0

      if (sqlLower.includes('where id = ?')) {
        const id = params[params.length - 1]
        const index = memoryDB.transactions.findIndex(item => item.id === id)

        if (index !== -1) {
          const transaction = memoryDB.transactions[index]

          // 简化的更新逻辑
          if (sqlLower.includes('状态')) {
            transaction.状态 = params.find(p => p === '计划' || p === '完成') || transaction.状态
          }
          if (sqlLower.includes('交易名称')) {
            transaction.交易名称 = params[0]
          }

          updated = 1
        }
      }

      return { changes: updated }
    }

    return { changes: 0 }
  }

  private handleDelete(sql: string, params: any[]) {
    const sqlLower = sql.toLowerCase()

    if (sqlLower.includes('from projects') && sqlLower.includes('where id = ?')) {
      const id = params[0]
      const index = memoryDB.projects.findIndex(item => item.id === id)
      if (index !== -1) {
        memoryDB.projects.splice(index, 1)
        return { changes: 1 }
      }
    }

    if (sqlLower.includes('from transactions') && sqlLower.includes('where id = ?')) {
      const id = params[0]
      const index = memoryDB.transactions.findIndex(item => item.id === id)
      if (index !== -1) {
        memoryDB.transactions.splice(index, 1)
        return { changes: 1 }
      }
    }

    return { changes: 0 }
  }
}

// 单例实例
let dbInstance: MemoryDatabase | null = null

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new MemoryDatabase()
    console.log('Memory database instance created')
  }
  return dbInstance
}

// 计算函数（保持与原有接口兼容）
export function calculateProjectStats(projectId: number, db: any) {
  const transactions = db.prepare(`
    SELECT * FROM transactions
    WHERE 项目ID = ? AND 状态 = '完成'
    ORDER BY 交易时间
  `).all(projectId);

  let 股数 = 0;
  let 成本金额 = 0;

  for (const transaction of transactions as any[]) {
    const { 交易类型, 股数: 交易股数, 交易金额 } = transaction;

    if (交易类型 === '做多' || 交易类型 === '空头平仓') {
      股数 += 交易股数 || 0;
      成本金额 += 交易金额 || 0;
    } else if (交易类型 === '做空' || 交易类型 === '多头平仓') {
      股数 -= 交易股数 || 0;
      成本金额 -= 交易金额 || 0;
    }
  }

  const project = db.prepare('SELECT 当前价 FROM projects WHERE id = ?').get(projectId) as any;
  const 当前价 = project?.当前价 || 0;

  const overview = db.prepare('SELECT 总金额 FROM overview WHERE id = 1').get() as any;
  const 总金额 = overview?.总金额 || 0;

  const 成本价 = 股数 > 0 ? 成本金额 / 股数 : 0;
  const 当前金额 = 股数 * 当前价;
  const 盈亏金额 = 当前金额 - 成本金额;
  const 项目盈亏率 = 成本金额 > 0 ? (盈亏金额 / 成本金额) * 100 : 0;
  const 仓位 = 总金额 > 0 ? (当前金额 / 总金额) * 100 : 0;
  const 总盈亏率 = 总金额 > 0 ? (盈亏金额 / 总金额) * 100 : 0;

  return {
    成本价,
    股数,
    仓位,
    成本金额,
    当前金额,
    盈亏金额,
    项目盈亏率,
    总盈亏率
  };
}

export function calculateOverallStats(db: any) {
  const projects = db.prepare('SELECT * FROM projects').all() as any[];

  let 总成本金额 = 0;
  let 总当前金额 = 0;
  let 总盈亏金额 = 0;

  for (const project of projects) {
    总成本金额 += project.成本金额 || 0;
    总当前金额 += project.当前金额 || 0;
    总盈亏金额 += project.盈亏金额 || 0;
  }

  const 总盈亏率 = 总成本金额 > 0 ? (总盈亏金额 / 总成本金额) * 100 : 0;

  return {
    总金额: 总当前金额,
    成本金额: 总成本金额,
    持仓金额: 总当前金额,
    盈亏金额: 总盈亏金额,
    盈亏率: 总盈亏率,
    仓位: 总当前金额
  };
}

export function updateAllProjectStats(db: any) {
  const projects = db.prepare('SELECT id FROM projects').all() as any[];

  for (const project of projects) {
    const stats = calculateProjectStats(project.id, db);

    db.prepare(`
      UPDATE projects SET
        成本价 = ?, 股数 = ?, 仓位 = ?, 成本金额 = ?,
        当前金额 = ?, 盈亏金额 = ?, 项目盈亏率 = ?, 总盈亏率 = ?
      WHERE id = ?
    `).run(
      stats.成本价, stats.股数, stats.仓位, stats.成本金额,
      stats.当前金额, stats.盈亏金额, stats.项目盈亏率, stats.总盈亏率,
      project.id
    );
  }
}

export function calculateTransactionDistance(transaction: any, currentPrice: number) {
  const { 警告方向, 交易价 } = transaction;

  if (!警告方向 || !交易价 || !currentPrice) return 0;

  if (警告方向 === '向下') {
    return -((交易价 - currentPrice) / currentPrice) * 100;
  } else if (警告方向 === '向上') {
    return ((交易价 - currentPrice) / currentPrice) * 100;
  }

  return 0;
}