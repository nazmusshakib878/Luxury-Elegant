function isProductionOrderIntakeEnabled(isVercel, vercelEnvironment, commerceEnabled) {
  return !isVercel || vercelEnvironment !== 'production' || commerceEnabled === true;
}

module.exports = { isProductionOrderIntakeEnabled };
