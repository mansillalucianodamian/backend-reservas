import { CanchaStrategy } from './CanchaStrategy.js';
import { QuinchoStrategy } from './QuinchoStrategy.js';
import { ServerError } from '../../error.js';

/**
 * Registro de Estrategias de Recursos (SOLID - Open/Closed Principle).
 * Permite registrar nuevas estrategias para recursos como SUM, Pileta, etc.,
 * sin modificar ReservaService.
 */
export class ResourceStrategyRegistry {
    constructor() {
        this.strategies = new Map();
        this.register(new CanchaStrategy());
        this.register(new QuinchoStrategy());
    }

    /**
     * Registra una nueva estrategia de recurso
     */
    register(strategy) {
        if (!strategy || !strategy.tipo) {
            throw new Error('La estrategia debe definir una propiedad "tipo"');
        }
        this.strategies.set(strategy.tipo.toLowerCase(), strategy);
    }

    /**
     * Obtiene la estrategia asociada a un tipo de recurso
     */
    get(tipo = 'cancha') {
        const key = (tipo || 'cancha').toLowerCase();
        const strategy = this.strategies.get(key);
        if (!strategy) {
            throw new ServerError(400, `Tipo de recurso no soportado: '${tipo}'`);
        }
        return strategy;
    }

    /**
     * Verifica si un tipo de recurso está registrado
     */
    has(tipo) {
        return this.strategies.has((tipo || '').toLowerCase());
    }
}

export const defaultStrategyRegistry = new ResourceStrategyRegistry();
