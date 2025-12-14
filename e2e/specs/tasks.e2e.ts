/**
 * Test E2E - Tareas
 * Prueba: Crear, editar y eliminar tareas
 */

describe('Tasks E2E', () => {
  beforeEach(async () => {
    // Login antes de cada test
    await driver.url('about:blank');
    const emailInput = await driver.$('input[placeholder*="email"]');
    await emailInput.setValue('test@example.com');
    const passwordInput = await driver.$('input[type="password"]');
    await passwordInput.setValue('password123');
    const loginButton = await driver.$('button[type="submit"]');
    await loginButton.click();

    // Esperar a que cargue la lista de tareas
    await driver.$('ion-list').waitForDisplayed({ timeout: 10000 });
  });

  it('should create new task', async () => {
    const addButton = await driver.$('button[name="add-task"]');
    await addButton.click();

    const titleInput = await driver.$('input[placeholder*="Título"]');
    await titleInput.setValue('Nueva Tarea de Prueba');

    const descriptionInput = await driver.$('textarea[placeholder*="Descripción"]');
    await descriptionInput.setValue('Esta es una descripción de prueba');

    const saveButton = await driver.$('button[name="save-task"]');
    await saveButton.click();

    // Esperar a que aparezca la tarea en la lista
    const taskItem = await driver.$('ion-item:contains("Nueva Tarea de Prueba")');
    await taskItem.waitForDisplayed({ timeout: 5000 });

    expect(await taskItem.isDisplayed()).toBe(true);
  });

  it('should attach photo to task', async () => {
    const firstTask = await driver.$('ion-item:first-child');
    await firstTask.click();

    const cameraButton = await driver.$('button[name="attach-photo"]');
    await cameraButton.click();

    // Seleccionar foto desde galería (mock)
    const photoElement = await driver.$('img[name="task-photo"]');
    await photoElement.waitForDisplayed({ timeout: 5000 });

    expect(await photoElement.isDisplayed()).toBe(true);
  });

  it('should attach GPS location to task', async () => {
    const firstTask = await driver.$('ion-item:first-child');
    await firstTask.click();

    const locationButton = await driver.$('button[name="attach-location"]');
    await locationButton.click();

    // Esperar a que se capture la ubicación
    const locationDisplay = await driver.$('span[name="task-location"]');
    await locationDisplay.waitForDisplayed({ timeout: 10000 });

    expect(await locationDisplay.isDisplayed()).toBe(true);
  });

  it('should sync tasks with server', async () => {
    const syncButton = await driver.$('button[name="sync-tasks"]');
    await syncButton.click();

    // Esperar a que aparezca indicador de carga
    const loadingSpinner = await driver.$('ion-spinner');
    await loadingSpinner.waitForDisplayed({ timeout: 15000 });

    // Esperar a que termine el sync
    await driver.pause(2000);

    const successMessage = await driver.$('ion-toast:contains("Sincronizado")');
    const isDisplayed = await successMessage.isDisplayed().catch(() => false);
    expect(isDisplayed).toBe(true);
  });

  it('should mark task as done', async () => {
    const firstTask = await driver.$('ion-item:first-child');
    await firstTask.click();

    const doneCheckbox = await driver.$('ion-checkbox[name="task-done"]');
    await doneCheckbox.click();

    const saveButton = await driver.$('button[name="save-task"]');
    await saveButton.click();

    // Verificar que la tarea tiene el estado actualizado
    await driver.pause(1000);
    expect(await doneCheckbox.isChecked()).toBe(true);
  });

  it('should delete task', async () => {
    const firstTask = await driver.$('ion-item:first-child');
    const taskTitle = await firstTask.getText();

    // Click en botón de más opciones
    const moreButton = await firstTask.$('button[name="more-options"]');
    await moreButton.click();

    const deleteButton = await driver.$('button[name="delete-task"]');
    await deleteButton.click();

    // Confirmar eliminación
    const confirmButton = await driver.$('button:contains("Eliminar")');
    await confirmButton.click();

    // Esperar a que se elimine
    await driver.pause(1000);

    const deletedTask = await driver.$(`ion-item:contains("${taskTitle}")`);
    const isDisplayed = await deletedTask.isDisplayed().catch(() => false);
    expect(isDisplayed).toBe(false);
  });
});
