import mongoose, {
    RequiredFields,
    UniqueFields,
    EncryptedFields,
    Schema,
} from '../Infrastructure/ORM';

import { RoleArray } from 'Common/Types/Role';

const schema: Schema = new Schema({
    domain: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Sso',
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: RoleArray.filter((item: string) => {
            return item !== 'Owner';
        }), // All roles except Owner
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
    },
    deletedById: {
        type: String,
        ref: 'User',
    },
});
export const requiredFields: RequiredFields = schema.requiredPaths();

export const uniqueFields: UniqueFields = [];
export const encryptedFields: EncryptedFields = [];

export const slugifyField: string = '';

export default mongoose.model('SsoDefaultRole', schema);