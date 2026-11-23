/**
 * COMP229 - Web Application Development
 * Project: IncidentFlow - Incident Management System
 *
 * Team Members:
 * Ivan Seck Ali - 301501210
 * Robel Teffera - 301113578
 * Ryan Sunil - 301495962
 * Bronson Pearl - 301328703
 *
 * Description:
 * This file is part of the IncidentFlow MERN application.
 */

// demo password from the environment, same as the other test
const password = () => Cypress.env('DEMO_PASSWORD');

// helpers to sign in and out
function signIn(email) {
  cy.visit('/signin');
  cy.get('#email').clear().type(email);
  cy.get('#password').type(password(), { log: false });
  cy.contains('button', /^Sign in$/).click();
  cy.location('pathname').should('eq', '/dashboard');
}

// signing out sends you back to the home page
function signOut() {
  cy.get('.sidebar').contains('button', 'Sign Out').click();
  cy.location('pathname').should('eq', '/');
}

// ---------- TEST ----------

describe('Assignment and resolution workflow', () => {
  const title = `Cypress assignment ${Date.now()}`;

  // saved in the first test so the others can go straight to the incident
  let incidentUrl;

  // step 1 - user reports
  it('user reports an incident', () => {
    signIn(Cypress.env('userEmail'));
    cy.visit('/incidents/new');
    cy.get('#incident-title').type(title);
    cy.get('#incident-description').type('Workflow test: should be assigned, worked and resolved.');
    cy.get('#incident-category').select('IT');
    cy.get('#incident-location').type('QA Lab');
    cy.contains('button', 'Submit incident').click();
    cy.contains('h1', title);
    cy.location('pathname').then((p) => { incidentUrl = p; });
  });

  // step 2 - admin assigns the technician
  it('admin assigns Jordan Lee', () => {
    signIn(Cypress.env('adminEmail'));
    cy.visit(incidentUrl);
    cy.get('#assign-tech').select('Jordan Lee');
    cy.contains('Technician assigned.');
    cy.get('.detail-title').contains('Assigned');
    signOut();
  });

  // step 3 - technician works it and resolves it
  it('technician starts work and resolves', () => {
    signIn(Cypress.env('techEmail'));
    cy.visit('/assigned');
    cy.contains('.incident-table a', title).click();
    cy.contains('button', 'Start work').click();
    cy.get('.detail-title').contains('In Progress');
    cy.contains('button', 'Resolve').click();
    cy.get('#resolution').type('Resolved by the Cypress workflow test.');
    cy.contains('button', 'Mark resolved').click();
    cy.get('.detail-title').contains('Resolved');
    signOut();
  });

  // step 4 - reporter gets notified and closes it
  it('reporter sees the resolution notification and closes', () => {
    signIn(Cypress.env('userEmail'));
    cy.visit('/notifications');
    cy.contains(`was resolved: ${title}`).should('be.visible');
    cy.visit(incidentUrl);
    cy.contains('button', 'Close incident').click();
    cy.get('.detail-title').contains('Closed');
  });
});
