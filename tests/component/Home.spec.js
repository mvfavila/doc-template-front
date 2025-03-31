import { mount } from "@cypress/vue";
import App from "@/App.vue";

describe("Home Page", () => {
  it("shows the correct title", () => {
    cy.mount(App);
    cy.contains("h1", "Seu escritório jurídico digital").should("be.visible");
  });

  it("shows the login button", () => {
    cy.mount(App);
    cy.get("button").contains("Login").should("be.visible");
  });
});
