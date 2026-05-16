"""Food vertical: meal categories, dishes, menu, shopping, pantry."""

# Do not import router here — it pulls deps → middleware.auth and causes a circular
# import when finance/auth loads before the food package is fully initialized.
