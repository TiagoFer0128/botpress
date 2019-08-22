import { clickOn, expectAdminApiCallSuccess, fillField, isLoggedOn, setLoggedOn } from '../'
import { bpConfig } from '../../../jest-puppeteer.config'

describe('Admin - Init', () => {
  it('Load Login page', async () => {
    expect(page.url().includes('login') || page.url().includes('register')).toBeTruthy()
  })

  it('Enter credentials and submit', async () => {
    await fillField('#email', bpConfig.email)
    await fillField('#password', bpConfig.password)

    if (page.url().includes('/register')) {
      await fillField('#confirmPassword', bpConfig.password)
      await clickOn('#btn-register')
    } else {
      await clickOn('#btn-signin')
    }
  })

  it('Load workspaces', async () => {
    setLoggedOn(true)
    await page.waitForNavigation()
    await page.waitFor(200)
    await expect(page.url()).toMatch(`${bpConfig.host}/admin/workspace/bots`)
  })

  if (bpConfig.recreateBot) {
    it('Create test bot', async () => {
      await clickOn('#btn-create-bot')
      await clickOn('#btn-new-bot')

      await fillField('#input-bot-name', bpConfig.botId)
      await fillField('#select-bot-templates', 'Welcome Bot')
      await page.keyboard.press('Enter')

      await clickOn('#btn-modal-create-bot')
      await expectAdminApiCallSuccess('bots', 'POST')
    })
  }
})
