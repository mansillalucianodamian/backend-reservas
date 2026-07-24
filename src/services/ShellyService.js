import axios from 'axios';
import ENVIROMENT from '../config/enviroment.config.js';

const LOCAL_IP = '192.168.0.14'; // Fallback local para pruebas del usuario

export async function encenderLuz() {
    const { SHELLY_CLOUD_URL, SHELLY_DEVICE_ID, SHELLY_AUTH_KEY } = ENVIROMENT;

    if (SHELLY_CLOUD_URL && SHELLY_DEVICE_ID && SHELLY_AUTH_KEY) {
        console.log(`[SHELLY CLOUD]: Enviando comando ENCENDER a dispositivo: ${SHELLY_DEVICE_ID}`);
        const url = `${SHELLY_CLOUD_URL}/device/relay/control`;
        
        const params = new URLSearchParams();
        params.append('id', SHELLY_DEVICE_ID);
        params.append('auth_key', SHELLY_AUTH_KEY);
        params.append('turn', 'on');
        params.append('channel', '0');

        return axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    console.log(`[SHELLY LOCAL]: Usando fallback local a IP: ${LOCAL_IP}`);
    return axios.get(`http://${LOCAL_IP}/relay/0?turn=on`);
}

export async function apagarLuz() {
    const { SHELLY_CLOUD_URL, SHELLY_DEVICE_ID, SHELLY_AUTH_KEY } = ENVIROMENT;

    if (SHELLY_CLOUD_URL && SHELLY_DEVICE_ID && SHELLY_AUTH_KEY) {
        console.log(`[SHELLY CLOUD]: Enviando comando APAGAR a dispositivo: ${SHELLY_DEVICE_ID}`);
        const url = `${SHELLY_CLOUD_URL}/device/relay/control`;

        const params = new URLSearchParams();
        params.append('id', SHELLY_DEVICE_ID);
        params.append('auth_key', SHELLY_AUTH_KEY);
        params.append('turn', 'off');
        params.append('channel', '0');

        return axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    console.log(`[SHELLY LOCAL]: Usando fallback local a IP: ${LOCAL_IP}`);
    return axios.get(`http://${LOCAL_IP}/relay/0?turn=off`);
}

export async function encenderAireQuincho() {
    const { SHELLY_QUINCHO_CLOUD_URL, SHELLY_QUINCHO_DEVICE_ID, SHELLY_QUINCHO_AUTH_KEY, SHELLY_QUINCHO_LOCAL_IP } = ENVIROMENT;
    const localIp = SHELLY_QUINCHO_LOCAL_IP || '192.168.1.105';

    if (SHELLY_QUINCHO_CLOUD_URL && SHELLY_QUINCHO_DEVICE_ID && SHELLY_QUINCHO_AUTH_KEY) {
        console.log(`[SHELLY QUINCHO CLOUD]: Enviando comando ENCENDER a dispositivo: ${SHELLY_QUINCHO_DEVICE_ID}`);
        const url = `${SHELLY_QUINCHO_CLOUD_URL}/device/relay/control`;
        
        const params = new URLSearchParams();
        params.append('id', SHELLY_QUINCHO_DEVICE_ID);
        params.append('auth_key', SHELLY_QUINCHO_AUTH_KEY);
        params.append('turn', 'on');
        params.append('channel', '0');

        return axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    console.log(`[SHELLY QUINCHO LOCAL]: Usando fallback local a IP: ${localIp}`);
    return axios.get(`http://${localIp}/relay/0?turn=on`);
}

export async function apagarAireQuincho() {
    const { SHELLY_QUINCHO_CLOUD_URL, SHELLY_QUINCHO_DEVICE_ID, SHELLY_QUINCHO_AUTH_KEY, SHELLY_QUINCHO_LOCAL_IP } = ENVIROMENT;
    const localIp = SHELLY_QUINCHO_LOCAL_IP || '192.168.1.105';

    if (SHELLY_QUINCHO_CLOUD_URL && SHELLY_QUINCHO_DEVICE_ID && SHELLY_QUINCHO_AUTH_KEY) {
        console.log(`[SHELLY QUINCHO CLOUD]: Enviando comando APAGAR a dispositivo: ${SHELLY_QUINCHO_DEVICE_ID}`);
        const url = `${SHELLY_QUINCHO_CLOUD_URL}/device/relay/control`;

        const params = new URLSearchParams();
        params.append('id', SHELLY_QUINCHO_DEVICE_ID);
        params.append('auth_key', SHELLY_QUINCHO_AUTH_KEY);
        params.append('turn', 'off');
        params.append('channel', '0');

        return axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    console.log(`[SHELLY QUINCHO LOCAL]: Usando fallback local a IP: ${localIp}`);
    return axios.get(`http://${localIp}/relay/0?turn=off`);
}
