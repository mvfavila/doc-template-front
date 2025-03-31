import { mount } from '@cypress/vue'

// Add global app plugins, components etc
Cypress.Commands.add('mount', mount)
