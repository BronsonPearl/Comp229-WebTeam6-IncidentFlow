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

// the demo password comes from the CYPRESS_DEMO_PASSWORD environment variable, never typed in the code
const password = () => Cypress.env('DEMO_PASSWORD');

// reusable sign in steps, checks we land on the dashboard
function signIn(email) {
  cy.visit('/signin');
  cy.get('#email').clear().type(email);
  cy.get('#password').type(password(), { log: false });   // log: false hides the password in the Cypress log
  cy.contains('button', /^Sign in$/).click();
  cy.location('pathname').should('eq', '/dashboard');
}

// ---------- TEST ----------

describe('Report, edit and delete an incident', () => {
  // Date.now() makes the title unique every run
  const title = `Cypress test incident ${Date.now()}`;

  it('completes the core user workflow', () => {
    signIn(Cypress.env('userEmail'));

    // fill in and submit the report form
    cy.contains('a', 'Report Incident').first().click();
    cy.location('pathname').should('eq', '/incidents/new');
    cy.get('#incident-title').type(title);
    cy.get('#incident-description').type('Created by the Cypress end-to-end test to verify the reporting flow.');
    cy.get('#incident-category').select('Equipment');
    cy.get('#incident-priority').select('Low');
    cy.get('#incident-location').type('QA Lab');
    cy.contains('button', 'Submit incident').click();

    // success message, then we should be on the new incident page
    cy.contains('reported.').should('be.visible');
    cy.contains('h1', title).should('be.visible');
    cy.contains('Open').should('be.visible');

    // the incident should show up in My Incidents
    cy.contains('a', 'My Incidents').click();
    cy.contains('.incident-table a', title).should('be.visible').click();

    // edit the location and check it saved
    cy.contains('a', 'Edit').click();
    cy.get('#incident-location').clear().type('QA Lab - Bench 2');
    cy.contains('button', 'Save changes').click();
    cy.contains('Incident updated.').should('be.visible');
    cy.contains('dd', 'QA Lab - Bench 2').should('be.visible');

    // delete it (confirm in the dialog) to keep the data clean
    cy.contains('button', 'Delete').click();
    cy.get('[role=alertdialog]').contains('button', 'Delete').click();
    cy.location('pathname').should('eq', '/my-incidents');
    cy.contains(title).should('not.exist');
  });
});
