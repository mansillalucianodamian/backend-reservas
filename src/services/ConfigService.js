import DefaultConfigRepository from '../repositories/config.repository.js';
import * as DefaultShellyService from './ShellyService.js';
import { ServerError } from '../error.js';

/**
 * Servicio de Aplicación para Configuración del Sistema y Dispositivos IoT (Clean Architecture - ARC-03).
 * Desacopla los controladores de la base de datos y de la comunicación directa con hardware Shelly.
 */
export class ConfigService {
    constructor(
        configRepo = DefaultConfigRepository,
        shellyService = DefaultShellyService
    ) {
        this.configRepo = configRepo;
        this.shelly = shellyService;
    }

    /**
     * Chequeo de salud / ping a la base de datos
     */
    async ping() {
        return await this.configRepo.ping();
    }

    /**
     * Consulta de tarifa de cancha
     */
    async getPrecioCancha() {
        const precioStr = await this.configRepo.getByKey('precio_cancha');
        return precioStr ? parseInt(precioStr, 10) : 5000;
    }

    /**
     * Actualización de tarifa de cancha
     */
    async updatePrecioCancha(precio) {
        const precioNum = parseInt(precio, 10);
        if (isNaN(precioNum) || precioNum <= 0) {
            throw new ServerError(400, 'El precio debe ser un número entero positivo');
        }
        await this.configRepo.setByKey('precio_cancha', precioNum);
        return { ok: true, message: 'Precio de cancha actualizado con éxito' };
    }

    /**
     * Consulta de configuración y tarifas de quincho
     */
    async getPrecioQuincho() {
        const precioStr = await this.configRepo.getByKey('precio_quincho');
        const precio = precioStr ? parseInt(precioStr, 10) : 21500;
        const senaStr = await this.configRepo.getByKey('sena_quincho');
        const sena = senaStr ? parseInt(senaStr, 10) : 0;
        const precioAireStr = await this.configRepo.getByKey('precio_aire_quincho');
        const precio_aire = precioAireStr ? parseInt(precioAireStr, 10) : 10000;
        return { precio, sena, precio_aire };
    }

    /**
     * Actualización de tarifas de quincho
     */
    async updatePrecioQuincho({ precio, sena, precio_aire, precioAire }) {
        const precioNum = parseInt(precio, 10);
        if (isNaN(precioNum) || precioNum <= 0) {
            throw new ServerError(400, 'El precio del quincho debe ser un número entero positivo');
        }

        const aireValor = precio_aire !== undefined ? precio_aire : precioAire;
        const precioAireNum = aireValor !== undefined ? parseInt(aireValor, 10) : NaN;
        if (aireValor !== undefined && (isNaN(precioAireNum) || precioAireNum < 0)) {
            throw new ServerError(400, 'El precio del aire acondicionado debe ser un número mayor o igual a 0');
        }

        await this.configRepo.setByKey('precio_quincho', precioNum);
        if (sena !== undefined) {
            const senaNum = parseInt(sena, 10);
            if (!isNaN(senaNum) && senaNum >= 0) {
                await this.configRepo.setByKey('sena_quincho', senaNum);
            }
        }
        if (!isNaN(precioAireNum)) {
            await this.configRepo.setByKey('precio_aire_quincho', precioAireNum);
        }

        return { ok: true, message: 'Tarifas del quincho actualizadas con éxito' };
    }

    /**
     * Consulta de estado de luces / dispositivos Shelly
     */
    async getLucesStatus(tipo = 'cancha') {
        const isQuincho = tipo === 'quincho';
        const dbKey = isQuincho ? 'override_aire_quincho' : 'override_luces_cancha';
        const mode = (await this.configRepo.getByKey(dbKey)) || 'AUTO';

        let output = false;
        try {
            if (isQuincho) {
                const status = await this.shelly.getAireQuinchoStatus();
                output = status ? status.output : false;
            } else {
                const status = await this.shelly.getLuzStatus();
                output = status ? status.output : false;
            }
        } catch (err) {
            console.warn(`[CONFIG SERVICE] No se pudo obtener el estado real del Shelly (${tipo}):`, err.message);
        }

        return { output, mode };
    }

    /**
     * Actualización manual de modo de luces / Shelly (ON, OFF, AUTO)
     */
    async updateLucesMode(tipo = 'cancha', mode) {
        const isQuincho = tipo === 'quincho';
        if (!['ON', 'OFF', 'AUTO'].includes(mode)) {
            throw new ServerError(400, 'El modo de luces debe ser ON, OFF o AUTO');
        }

        const dbKey = isQuincho ? 'override_aire_quincho' : 'override_luces_cancha';
        await this.configRepo.setByKey(dbKey, mode);

        if (mode === 'ON' || mode === 'OFF') {
            await this.configRepo.setByKey(dbKey + '_updated_at', new Date().toISOString());
        }

        if (isQuincho) {
            if (mode === 'ON') {
                try {
                    await this.shelly.encenderAireQuincho();
                } catch (err) {
                    console.error('[CONFIG SERVICE] Error al encender aire quincho:', err.message);
                }
            } else if (mode === 'OFF') {
                try {
                    await this.shelly.apagarAireQuincho();
                } catch (err) {
                    console.error('[CONFIG SERVICE] Error al apagar aire quincho:', err.message);
                }
            }
        } else {
            if (mode === 'ON') {
                try {
                    await this.shelly.encenderLuz();
                } catch (err) {
                    console.error('[CONFIG SERVICE] Error al encender luz:', err.message);
                }
            } else if (mode === 'OFF') {
                try {
                    await this.shelly.apagarLuz();
                } catch (err) {
                    console.error('[CONFIG SERVICE] Error al apagar luz:', err.message);
                }
            }
        }

        return { ok: true, message: `Modo de dispositivo ${tipo} actualizado a ${mode}` };
    }
}

const defaultConfigService = new ConfigService();
export default defaultConfigService;
