import ApplicationSecurityModel from '../Models/applicationSecurity';
import moment from 'moment';

import { decrypt } from '../config/encryptDecrypt';
import ApplicationSecurityLogService from './ApplicationSecurityLogService';
import GitCredentialService from './GitCredentialService';
import ResourceCategoryService from './ResourceCategoryService';
import getSlug from '../Utils/getSlug';

import FindOneBy from '../Types/DB/FindOneBy';
import FindBy from '../Types/DB/FindBy';
import Query from '../Types/DB/Query';
import RealTimeService from './realTimeService';

export default class Service {
    public async create(data: $TSFixMe): void {
        const [
            applicationNameExist,
            gitRepositoryUrlExist,
            gitCredentialExist,
        ] = await Promise.all([
            this.findOneBy({
                query: { name: data.name, componentId: data.componentId },
                select: '_id',
            }),
            this.findOneBy({
                query: {
                    gitRepositoryUrl: data.gitRepositoryUrl,
                    componentId: data.componentId,
                },
                select: '_id',
            }),
            GitCredentialService.findOneBy({
                query: { _id: data.gitCredential },
                select: '_id',
            }),
        ]);

        if (applicationNameExist) {
            const error: $TSFixMe = new Error(
                'Application security with this name already exist in this component'
            );

            error.code = 400;
            throw error;
        }

        if (gitRepositoryUrlExist) {
            const error: $TSFixMe = new Error(
                'Application security with this git repository url already exist in this component'
            );

            error.code = 400;
            throw error;
        }

        if (!gitCredentialExist) {
            const error: $TSFixMe = new Error(
                'Git Credential not found or does not exist'
            );

            error.code = 400;
            throw error;
        }
        const resourceCategoryCount: $TSFixMe =
            await ResourceCategoryService.countBy({
                _id: data.resourceCategory,
            });
        if (!resourceCategoryCount || resourceCategoryCount === 0) {
            delete data.resourceCategory;
        }
        data.slug = getSlug(data.name);
        const applicationSecurity: $TSFixMe =
            await ApplicationSecurityModel.create(data);
        return applicationSecurity;
    }

    public async findOneBy({ query, populate, select, sort }: FindOneBy): void {
        if (!query) {
            query = {};
        }

        if (!query.deleted) {
            query.deleted = false;
        }

        // Won't be using lean() here because of iv cypher for password
        const applicationSecurityQuery: $TSFixMe =
            ApplicationSecurityModel.findOne(query).sort(sort);

        applicationSecurityQuery.select(select);

        applicationSecurityQuery.populate(populate);

        const applicationSecurity: $TSFixMe = await applicationSecurityQuery;
        return applicationSecurity;
    }

    public async findBy({
        query,
        limit,
        skip,
        populate,
        select,
        sort,
    }: FindBy): void {
        if (!query.deleted) {
            query.deleted = false;
        }

        // Won't be using lean() here because of iv cypher for password
        const applicationSecuritiesQuery: $TSFixMe =
            ApplicationSecurityModel.find(query)
                .sort(sort)
                .limit(limit.toNumber())
                .skip(skip.toNumber());

        applicationSecuritiesQuery.select(select);
        applicationSecuritiesQuery.populate(populate);

        const applicationSecurities: $TSFixMe =
            await applicationSecuritiesQuery;
        return applicationSecurities;
    }

    public async updateOneBy(
        query: Query,
        data: $TSFixMe,
        unsetData = null
    ): void {
        if (!query) {
            query = {};
        }

        if (!query.deleted) {
            query.deleted = false;
        }
        if (data && data.name) {
            data.slug = getSlug(data.name);
        }
        let applicationSecurity: $TSFixMe =
            await ApplicationSecurityModel.findOneAndUpdate(
                query,
                {
                    $set: data,
                },
                { new: true }
            ).populate('gitCredential');

        if (unsetData) {
            applicationSecurity =
                await ApplicationSecurityModel.findOneAndUpdate(
                    query,
                    { $unset: unsetData },
                    {
                        new: true,
                    }
                );
        }
        if (!applicationSecurity) {
            const error: $TSFixMe = new Error(
                'Application Security not found or does not exist'
            );

            error.code = 400;
            throw error;
        }

        const populateApplicationSecurity: $TSFixMe = [
            { path: 'componentId', select: '_id slug name slug' },

            { path: 'resourceCategory', select: 'name' },
            {
                path: 'gitCredential',
                select: 'gitUsername gitPassword iv projectId deleted',
            },
        ];

        const selectApplicationSecurity: $TSFixMe =
            '_id name slug gitRepositoryUrl gitCredential componentId resourceCategory lastScan scanned scanning deleted';

        applicationSecurity = this.findOneBy({
            query: { _id: applicationSecurity._id },
            populate: populateApplicationSecurity,
            select: selectApplicationSecurity,
        });
        return applicationSecurity;
    }

    public async deleteBy(query: Query): void {
        let applicationSecurity: $TSFixMe = await this.countBy(query);

        if (!applicationSecurity) {
            const error: $TSFixMe = new Error(
                'Application Security not found or does not exist'
            );

            error.code = 400;
            throw error;
        }

        const securityLog: $TSFixMe =
            await ApplicationSecurityLogService.findOneBy({
                query: { securityId: applicationSecurity._id },
                select: '_id',
            });

        // Delete log associated with this application security
        if (securityLog) {
            await ApplicationSecurityLogService.deleteBy({
                _id: securityLog._id,
            });
        }

        await this.updateOneBy(query, {
            deleted: true,
            deletedAt: Date.now(),
        });

        const populateApplicationSecurity: $TSFixMe = [
            { path: 'componentId', select: '_id slug name slug' },

            { path: 'resourceCategory', select: 'name' },
            {
                path: 'gitCredential',
                select: 'gitUsername gitPassword iv projectId deleted',
            },
        ];

        const selectApplicationSecurity: $TSFixMe =
            '_id name slug gitRepositoryUrl gitCredential componentId resourceCategory lastScan scanned scanning deleted';

        applicationSecurity = await this.findOneBy({
            query: { ...query, deleted: true },
            populate: populateApplicationSecurity,
            select: selectApplicationSecurity,
        });
        return applicationSecurity;
    }

    public async hardDelete(query: Query): void {
        await ApplicationSecurityModel.deleteMany(query);
        return 'Application Securities deleted successfully';
    }

    public async getSecuritiesToScan(): void {
        const oneDay: $TSFixMe = moment().subtract(1, 'days').toDate();

        const populateApplicationSecurity: $TSFixMe = [
            {
                path: 'componentId',
                select: '_id slug name slug',
            },

            { path: 'resourceCategory', select: 'name' },
            {
                path: 'gitCredential',
                select: 'sshTitle sshPrivateKey gitUsername gitPassword iv projectId deleted',
            },
        ];

        const selectApplicationSecurity: $TSFixMe =
            '_id name slug gitRepositoryUrl gitCredential componentId resourceCategory lastScan scanned scanning deleted';

        const securities: $TSFixMe = await this.findBy({
            query: {
                $or: [{ lastScan: { $lt: oneDay } }, { scanned: false }],
                scanning: false,
            },
            select: selectApplicationSecurity,
            populate: populateApplicationSecurity,
        });
        return securities;
    }

    public async decryptPassword(security: $TSFixMe): void {
        const values: $TSFixMe = [];
        for (let i: $TSFixMe = 0; i <= 15; i++) {
            values.push(security.gitCredential.iv[i]);
        }
        const iv: $TSFixMe = Buffer.from(values);
        security.gitCredential.gitPassword = await decrypt(
            security.gitCredential.gitPassword,
            iv
        );
        return security;
    }

    public async updateScanTime(query: Query): void {
        const newDate: $TSFixMe = new Date();
        const applicationSecurity: $TSFixMe = await this.updateOneBy(query, {
            lastScan: newDate,
            scanned: true,
            scanning: false,
        });

        RealTimeService.handleScanning({
            security: applicationSecurity,
        });
        return applicationSecurity;
    }
    public async countBy(query: Query): void {
        if (!query) {
            query = {};
        }

        if (!query.deleted) {
            query.deleted = false;
        }
        const count: $TSFixMe = await ApplicationSecurityModel.countDocuments(
            query
        );
        return count;
    }
}