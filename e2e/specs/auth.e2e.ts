/**
 * Test E2E - Login
 * Prueba: Login con credenciales válidas
 */

// WebDriver/Appium global driver (satisfacer compilador TS)
declare const driver: any;

describe('Authentication E2E', () => {
  beforeEach(async () => {
    // Navegar a la aplicación
    await driver.url('about:blank');
  });

  it('should login with valid credentials', async () => {
    // Esperar a que se cargue la página de login
    const emailInput = await driver.$('input[placeholder*="email"]');
    await emailInput.waitForDisplayed({ timeout: 5000 });

    // Ingresar credenciales
    await emailInput.setValue('test@example.com');
    const passwordInput = await driver.$('input[type="password"]');
    await passwordInput.setValue('password123');

    // Hacer clic en el botón de login
    const loginButton = await driver.$('button[type="submit"]');
    await loginButton.click();

    // Esperar a que se redirija a la pantalla principal
    const tasksList = await driver.$('ion-list');
    await tasksList.waitForDisplayed({ timeout: 10000 });

    expect(await tasksList.isDisplayed()).toBe(true);
  });

  it('should show error with invalid credentials', async () => {
    const emailInput = await driver.$('input[placeholder*="email"]');
    await emailInput.waitForDisplayed({ timeout: 5000 });

    await emailInput.setValue('invalid@example.com');
    const passwordInput = await driver.$('input[type="password"]');
    await passwordInput.setValue('wrongpassword');

    const loginButton = await driver.$('button[type="submit"]');
    await loginButton.click();

    // Esperar a que aparezca el mensaje de error
    const errorMessage = await driver.$('ion-toast');
    await errorMessage.waitForDisplayed({ timeout: 5000 });

    expect(await errorMessage.isDisplayed()).toBe(true);
  });

  it('should navigate to register page', async () => {
    const registerLink = await driver.$('a:contains("Crear cuenta")');
    await registerLink.click();

    const registerForm = await driver.$('form[name="register"]');
    await registerForm.waitForDisplayed({ timeout: 5000 });

    expect(await registerForm.isDisplayed()).toBe(true);
  });
});
