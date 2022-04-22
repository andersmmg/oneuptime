import { API_DOCS_HOSTANME, API_PROTOCOL } from '../config';
import API from 'Common/utils/api';

class HelmAPI extends API {
    public constructor() {
        super(API_PROTOCOL, API_DOCS_HOSTANME);
    }
}

export default new HelmAPI();