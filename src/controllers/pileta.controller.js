import { PiletaService } from '../services/PiletaService.js';

export class PiletaController {
  /**
   * GET /api/pileta/config
   * Público para consulta de vecinos y boletería
   */
  static async getConfig(req, res) {
    try {
      const config = await PiletaService.getConfig();
      res.json({ ok: true, config });
    } catch (err) {
      console.error('Error al obtener config de pileta:', err);
      res.status(500).json({ ok: false, message: err.message || 'Error del servidor' });
    }
  }

  /**
   * PUT /api/pileta/config
   * Roles: boletero, recepcionista, super_admin
   */
  static async updateConfig(req, res) {
    try {
      const config = await PiletaService.updateConfig(req.body);
      res.json({ ok: true, message: 'Configuración de pileta actualizada con éxito', config });
    } catch (err) {
      console.error('Error al actualizar config de pileta:', err);
      res.status(400).json({ ok: false, message: err.message || 'Datos inválidos' });
    }
  }

  /**
   * POST /api/pileta/ventas
   * Roles: boletero, recepcionista, super_admin
   */
  static async registrarVenta(req, res) {
    try {
      const { cant_adultos, cant_ninos, cant_gratis, medio_pago, modalidad_tarifa } = req.body;
      const result = await PiletaService.registrarVenta({
        cant_adultos,
        cant_ninos,
        cant_gratis,
        medio_pago,
        modalidad_tarifa,
        usuario: req.user
      });

      res.status(201).json({
        ok: true,
        message: 'Entrada registrada y cobrada con éxito',
        ...result
      });
    } catch (err) {
      console.error('Error al registrar venta de pileta:', err);
      res.status(400).json({ ok: false, message: err.message || 'Error al procesar la venta' });
    }
  }

  /**
   * GET /api/pileta/caja-hoy
   * Roles: boletero, recepcionista, super_admin
   */
  static async getCajaHoy(req, res) {
    try {
      const data = await PiletaService.getCajaHoy();
      res.json({ ok: true, ...data });
    } catch (err) {
      console.error('Error al obtener caja de pileta:', err);
      res.status(500).json({ ok: false, message: err.message || 'Error del servidor' });
    }
  }

  /**
   * PUT /api/pileta/ventas/:id/anular
   * Roles: boletero, recepcionista, super_admin
   */
  static async anularVenta(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const result = await PiletaService.anularVenta(id, motivo, req.user);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error('Error al anular venta de pileta:', err);
      res.status(400).json({ ok: false, message: err.message || 'Error al anular venta' });
    }
  }

  /**
   * GET /api/pileta/historial
   * Roles: recepcionista, super_admin
   */
  static async getHistorial(req, res) {
    try {
      const { fecha } = req.query;
      const ventas = await PiletaService.getHistorialPorFecha(fecha);
      res.json({ ok: true, ventas });
    } catch (err) {
      console.error('Error al obtener historial de pileta:', err);
      res.status(400).json({ ok: false, message: err.message || 'Error al obtener historial' });
    }
  }
}

