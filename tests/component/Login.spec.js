import { mount } from '@cypress/vue'
import SignIn from '@/views/SignIn.vue'

describe('Login Page', () => {
  it('requires email to login', () => {
    cy.mount(SignIn)
    cy.get('form').submit()
    cy.contains('E-mail é obrigatório').should('be.visible')
  })
})