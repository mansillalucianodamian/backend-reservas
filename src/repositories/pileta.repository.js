import { pool } from '../config/db.js';

let schemaVerified = false;

export class PiletaRepository {
  /**
   * Asegura que la tabla pileta_config tenga todas las columnas oficiales de la Temporada 2026-2027
   */
  static async ensureSchema() {
    if (schemaVerified) return;
    try {
      const nuevosCampos = [
        { name: 'precio_adulto_finde_res', def: 'DECIMAL(10,2) NOT NULL DEFAULT 6000.00' },
        { name: 'precio_nino_finde_res', def: 'DECIMAL(10,2) NOT NULL DEFAULT 4000.00' },
        { name: 'precio_adulto_finde_nores', def: 'DECIMAL(10,2) NOT NULL DEFAULT 8000.00' },
        { name: 'precio_nino_finde_nores', def: 'DECIMAL(10,2) NOT NULL DEFAULT 5000.00' },
        { name: 'carnet_mayor_dic', def: 'DECIMAL(10,2) NOT NULL DEFAULT 30000.00' },
        { name: 'carnet_mayor_ene', def: 'DECIMAL(10,2) NOT NULL DEFAULT 35000.00' },
        { name: 'carnet_mayor_feb', def: 'DECIMAL(10,2) NOT NULL DEFAULT 30000.00' },
        { name: 'carnet_menor_dic', def: 'DECIMAL(10,2) NOT NULL DEFAULT 25000.00' },
        { name: 'carnet_menor_ene', def: 'DECIMAL(10,2) NOT NULL DEFAULT 30000.00' },
        { name: 'carnet_menor_feb', def: 'DECIMAL(10,2) NOT NULL DEFAULT 25000.00' }
      ];

      let addedNewColumns = false;
      for (const col of nuevosCampos) {
        const [cols] = await pool.query(`SHOW COLUMNS FROM pileta_config LIKE '${col.name}'`);
        if (cols.length === 0) {
          await pool.query(`ALTER TABLE pileta_config ADD COLUMN ${col.name} ${col.def}`);
          addedNewColumns = true;
        }
      }

      // Si recién migramos las columnas nuevas o estaban los valores ficticios iniciales (2500/1500), cargar los oficiales 2026-2027
      if (addedNewColumns) {
        await pool.query(
          `UPDATE pileta_config
           SET precio_adulto = CASE WHEN precio_adulto = 2500 THEN 4000 ELSE precio_adulto END,
               precio_nino = CASE WHEN precio_nino = 1500 THEN 3000 ELSE precio_nino END,
               horarios = 'Martes a Viernes de 16:00 a 20:00 hs | Sábados, Domingos y Feriados',
               mensaje_estado = 'Temporada 2026-2027: Inicio sábado 12/12/2026 hasta domingo 28/02/2027'
           WHERE id = 1`
        );
      }

      schemaVerified = true;
    } catch (err) {
      console.error('[PILETA REPO]: Error verificando esquema:', err.message);
    }
  }

  /**
   * Obtener configuración pública y de tarifas de la pileta
   */
  static async getConfig() {
    await this.ensureSchema();
    const [rows] = await pool.query(
      `SELECT id,
              precio_adulto,
              precio_nino,
              precio_adulto_finde_res,
              precio_nino_finde_res,
              precio_adulto_finde_nores,
              precio_nino_finde_nores,
              carnet_mayor_dic,
              carnet_mayor_ene,
              carnet_mayor_feb,
              carnet_menor_dic,
              carnet_menor_ene,
              carnet_menor_feb,
              abierta,
              horarios,
              mensaje_estado,
              updated_at
       FROM pileta_config
       ORDER BY id ASC
       LIMIT 1`
    );
    if (rows.length === 0) {
      return {
        precio_adulto: 4000.0,
        precio_nino: 3000.0,
        precio_adulto_finde_res: 6000.0,
        precio_nino_finde_res: 4000.0,
        precio_adulto_finde_nores: 8000.0,
        precio_nino_finde_nores: 5000.0,
        carnet_mayor_dic: 30000.0,
        carnet_mayor_ene: 35000.0,
        carnet_mayor_feb: 30000.0,
        carnet_menor_dic: 25000.0,
        carnet_menor_ene: 30000.0,
        carnet_menor_feb: 25000.0,
        abierta: 1,
        horarios: 'Martes a Viernes de 16:00 a 20:00 hs | Sábados, Domingos y Feriados',
        mensaje_estado: 'Temporada 2026-2027: Inicio sábado 12/12/2026 hasta domingo 28/02/2027'
      };
    }

    const r = rows[0];
    return {
      ...r,
      precio_adulto: Number(r.precio_adulto),
      precio_nino: Number(r.precio_nino),
      precio_adulto_finde_res: Number(r.precio_adulto_finde_res ?? 6000),
      precio_nino_finde_res: Number(r.precio_nino_finde_res ?? 4000),
      precio_adulto_finde_nores: Number(r.precio_adulto_finde_nores ?? 8000),
      precio_nino_finde_nores: Number(r.precio_nino_finde_nores ?? 5000),
      carnet_mayor_dic: Number(r.carnet_mayor_dic ?? 30000),
      carnet_mayor_ene: Number(r.carnet_mayor_ene ?? 35000),
      carnet_mayor_feb: Number(r.carnet_mayor_feb ?? 30000),
      carnet_menor_dic: Number(r.carnet_menor_dic ?? 25000),
      carnet_menor_ene: Number(r.carnet_menor_ene ?? 30000),
      carnet_menor_feb: Number(r.carnet_menor_feb ?? 25000)
    };
  }

  /**
   * Actualizar configuración y tarifas de la pileta
   */
  static async updateConfig({
    precio_adulto,
    precio_nino,
    precio_adulto_finde_res,
    precio_nino_finde_res,
    precio_adulto_finde_nores,
    precio_nino_finde_nores,
    carnet_mayor_dic,
    carnet_mayor_ene,
    carnet_mayor_feb,
    carnet_menor_dic,
    carnet_menor_ene,
    carnet_menor_feb,
    abierta,
    horarios,
    mensaje_estado
  }) {
    await this.ensureSchema();
    await pool.query(
      `UPDATE pileta_config
       SET precio_adulto = COALESCE(?, precio_adulto),
           precio_nino = COALESCE(?, precio_nino),
           precio_adulto_finde_res = COALESCE(?, precio_adulto_finde_res),
           precio_nino_finde_res = COALESCE(?, precio_nino_finde_res),
           precio_adulto_finde_nores = COALESCE(?, precio_adulto_finde_nores),
           precio_nino_finde_nores = COALESCE(?, precio_nino_finde_nores),
           carnet_mayor_dic = COALESCE(?, carnet_mayor_dic),
           carnet_mayor_ene = COALESCE(?, carnet_mayor_ene),
           carnet_mayor_feb = COALESCE(?, carnet_mayor_feb),
           carnet_menor_dic = COALESCE(?, carnet_menor_dic),
           carnet_menor_ene = COALESCE(?, carnet_menor_ene),
           carnet_menor_feb = COALESCE(?, carnet_menor_feb),
           abierta = COALESCE(?, abierta),
           horarios = COALESCE(?, horarios),
           mensaje_estado = COALESCE(?, mensaje_estado)
       WHERE id = 1`,
      [
        precio_adulto,
        precio_nino,
        precio_adulto_finde_res,
        precio_nino_finde_res,
        precio_adulto_finde_nores,
        precio_nino_finde_nores,
        carnet_mayor_dic,
        carnet_mayor_ene,
        carnet_mayor_feb,
        carnet_menor_dic,
        carnet_menor_ene,
        carnet_menor_feb,
        abierta,
        horarios,
        mensaje_estado
      ]
    );
    return this.getConfig();
  }

  /**
   * Registrar una nueva venta de entradas en la puerta
   */
  static async registrarVenta({
    cant_adultos,
    cant_ninos,
    cant_gratis,
    precio_adulto_unitario,
    precio_nino_unitario,
    total,
    medio_pago,
    usuario_id,
    cajero_nombre
  }) {
    const [result] = await pool.query(
      `INSERT INTO pileta_ventas (
         fecha_hora, cant_adultos, cant_ninos, cant_gratis,
         precio_adulto_unitario, precio_nino_unitario, total,
         medio_pago, usuario_id, cajero_nombre, estado
       ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cobrado')`,
      [
        cant_adultos || 0,
        cant_ninos || 0,
        cant_gratis || 0,
        precio_adulto_unitario || 0,
        precio_nino_unitario || 0,
        total || 0,
        medio_pago || 'efectivo',
        usuario_id || null,
        cajero_nombre || 'Boletería'
      ]
    );

    return result.insertId;
  }

  /**
   * Obtener una venta por ID
   */
  static async getVentaById(id) {
    const [rows] = await pool.query(
      `SELECT * FROM pileta_ventas WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Obtener todas las ventas del día actual
   */
  static async getVentasHoy() {
    const [rows] = await pool.query(
      `SELECT id, fecha_hora, cant_adultos, cant_ninos, cant_gratis,
              precio_adulto_unitario, precio_nino_unitario, total,
              medio_pago, usuario_id, cajero_nombre, estado, motivo_anulacion
       FROM pileta_ventas
       WHERE DATE(fecha_hora) = CURDATE()
       ORDER BY fecha_hora DESC`
    );
    return rows;
  }

  /**
   * Resumen de arqueo de caja del día de hoy
   */
  static async getResumenHoy() {
    const [rows] = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN estado = 'cobrado' THEN cant_adultos ELSE 0 END), 0) AS total_adultos,
         COALESCE(SUM(CASE WHEN estado = 'cobrado' THEN cant_ninos ELSE 0 END), 0) AS total_ninos,
         COALESCE(SUM(CASE WHEN estado = 'cobrado' THEN cant_gratis ELSE 0 END), 0) AS total_gratis,
         COALESCE(SUM(CASE WHEN estado = 'cobrado' THEN (cant_adultos + cant_ninos + cant_gratis) ELSE 0 END), 0) AS total_personas,
         COALESCE(SUM(CASE WHEN estado = 'cobrado' THEN total ELSE 0 END), 0) AS recaudacion_total,
         COALESCE(SUM(CASE WHEN estado = 'cobrado' AND medio_pago = 'efectivo' THEN total ELSE 0 END), 0) AS recaudacion_efectivo,
         COALESCE(SUM(CASE WHEN estado = 'cobrado' AND medio_pago = 'transferencia' THEN total ELSE 0 END), 0) AS recaudacion_transferencia,
         COALESCE(SUM(CASE WHEN estado = 'cobrado' THEN 1 ELSE 0 END), 0) AS transacciones_cobradas,
         COALESCE(SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END), 0) AS transacciones_anuladas
       FROM pileta_ventas
       WHERE DATE(fecha_hora) = CURDATE()`
    );

    const r = rows[0] || {};
    return {
      total_adultos: Number(r.total_adultos),
      total_ninos: Number(r.total_ninos),
      total_gratis: Number(r.total_gratis),
      total_personas: Number(r.total_personas),
      recaudacion_total: Number(r.recaudacion_total),
      recaudacion_efectivo: Number(r.recaudacion_efectivo),
      recaudacion_transferencia: Number(r.recaudacion_transferencia),
      transacciones_cobradas: Number(r.transacciones_cobradas),
      transacciones_anuladas: Number(r.transacciones_anuladas)
    };
  }

  /**
   * Anular una venta registrada
   */
  static async anularVenta(id, motivo = 'Anulada por operador') {
    await pool.query(
      `UPDATE pileta_ventas
       SET estado = 'anulado', motivo_anulacion = ?
       WHERE id = ?`,
      [motivo, id]
    );
    return this.getVentaById(id);
  }

  /**
   * Historial de ventas filtrado por fecha
   */
  static async getVentasPorFecha(fechaStr) {
    const [rows] = await pool.query(
      `SELECT id, fecha_hora, cant_adultos, cant_ninos, cant_gratis,
              precio_adulto_unitario, precio_nino_unitario, total,
              medio_pago, usuario_id, cajero_nombre, estado, motivo_anulacion
       FROM pileta_ventas
       WHERE DATE(fecha_hora) = ?
       ORDER BY fecha_hora DESC`,
      [fechaStr]
    );
    return rows;
  }
}
