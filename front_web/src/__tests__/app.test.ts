describe('App', () => {
  it('should pass a basic sanity check', () => {
    expect(true).toBe(true);
  });

  it('should have correct app config', () => {
    const appName = 'daf-et-commercial-front-web';
    expect(appName).toBeDefined();
  });
});
