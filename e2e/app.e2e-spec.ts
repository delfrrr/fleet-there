import { FleetTherePage } from './app.po';

describe('fleet-there App', () => {
  let page: FleetTherePage;

  beforeEach(() => {
    page = new FleetTherePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
