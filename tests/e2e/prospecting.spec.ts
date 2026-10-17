import { expect, test, type Page } from "@playwright/test";

/**
 * Main flow: Mérida > Libertador > restaurants in red > open the business > move to "Contactado".
 * Requires the demo seed (`pnpm db:seed`). Safe to re-run: if the lead is already
 * contacted, it is moved back to "Nuevo" first.
 */

/** The visible nav link (bottom bar on mobile, sidebar on desktop). */
const navLink = (page: Page, name: string) =>
  page.getByRole("link", { name, exact: true }).locator("visible=true").first();

/** Clicks a filter chip until it is pressed (the first click can land before hydration). */
async function pressChip(page: Page, testId: string, url: RegExp) {
  const chip = page.getByTestId(testId);
  await expect(async () => {
    if ((await chip.getAttribute("aria-pressed")) !== "true") await chip.click();
    await expect(page).toHaveURL(url, { timeout: 2000 });
  }).toPass();
}

test("Mérida > restaurantes en rojo de Libertador > abrir ficha > mover a Contactado", async ({
  page,
}) => {
  await page.goto("/");
  await navLink(page, "Explorar").click();
  await expect(page).toHaveURL(/\/explorar$/);

  await page
    .getByRole("link", { name: /Mérida/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/explorar\/merida$/);

  await page
    .getByRole("link", { name: /Libertador/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/explorar\/merida\/libertador/);

  // Red traffic light + Gastronomía > Restaurantes.
  await pressChip(page, "light-red", /luz=red/);
  await pressChip(page, "cat-gastronomia", /cat=gastronomia/);

  await page.getByRole("button", { name: /Filtros/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("combobox").last().click();
  await page.getByRole("option", { name: "Restaurantes", exact: true }).click();
  await expect(page).toHaveURL(/cat=restaurantes/);
  await expect(page.getByRole("listbox")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  const cards = page.getByTestId("business-cards").locator("article");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i)).toContainText("Restaurantes");
    await expect(cards.nth(i)).toContainText("Rojo");
  }

  // Open the top opportunity.
  const firstLink = cards.first().getByRole("link").first();
  const name = (await firstLink.innerText()).trim();
  await firstLink.click();
  await expect(page).toHaveURL(/\/negocio\/\d+/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name);

  // The success criterion: a prefilled WhatsApp message is one tap away.
  const whatsapp = page.getByRole("link", { name: /WhatsApp/ }).first();
  if (await whatsapp.count())
    await expect(whatsapp).toHaveAttribute("href", /wa\.me\/58\d+\?text=/);

  const stages = page.getByTestId("stage-buttons");
  const contacted = stages.getByRole("radio", { name: "Contactado" });
  if ((await contacted.getAttribute("aria-checked")) === "true") {
    await stages.getByRole("radio", { name: "Nuevo" }).click();
    await expect(stages.getByRole("radio", { name: "Nuevo" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  }
  await contacted.click();
  await expect(contacted).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Movido a Contactado")).toBeVisible();

  // It shows up in the pipeline's "Contactado" column.
  await navLink(page, "Pipeline").click();
  await expect(page).toHaveURL(/\/pipeline/);
  await expect(
    page.getByTestId("column-contacted").getByTestId("lead-card").filter({ hasText: name }),
  ).toHaveCount(1);
});
