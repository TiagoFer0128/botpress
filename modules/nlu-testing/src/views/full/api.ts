import { AxiosInstance } from 'axios'

export type TestResult = 'pending' | 'success' | 'failed' | 'running'
export interface Test {
  id: string
  utterance: string
  condition: [string, string, string]
  result?: TestResult
  failure?: TestFailure
}
export interface TestFailure {
  reason: string
}

export interface TestingAPI {
  fetchTests: () => Promise<Test[]>
  fetchIntents: () => Promise<any[]>
  updateTest: (x: Test) => Promise<void>
  deleteTest: (x: Test) => Promise<void>
  runTest: (x: Test) => Promise<TestFailure | undefined>
}

export const makeApi = (bp: { axios: AxiosInstance }): TestingAPI => {
  return {
    fetchTests: async () => {
      const { data } = await bp.axios.get(`/mod/nlu-testing/tests`)
      return data as Test[]
    },

    fetchIntents: async () => {
      const { data } = await bp.axios.get('/mod/nlu/intents')
      return data
    },

    deleteTest: async (test: Test) => {
      await bp.axios.delete(`/mod/nlu-testing/tests/${test.id}`)
    },

    updateTest: async (test: Test) => {
      await bp.axios.post(`/mod/nlu-testing/tests/${test.id}`, test)
    },

    runTest: async (test: Test): Promise<TestFailure | undefined> => {
      const { data } = await bp.axios.post(`/mod/nlu-testing/tests/${test.id}/run`)

      return // TODO:
    }
  }
}
