module.exports = {
  apps: [{
    name: "reservas-backend",
    script: "src/main.js",
    env: {
      DB_HOST: "127.0.0.1",
      DB_PORT: "3306",
      DB_USER: "reservas_user",
      DB_PASSWORD: "reservas2026",
      DB_NAME: "reservas"
    }
  }]
}
