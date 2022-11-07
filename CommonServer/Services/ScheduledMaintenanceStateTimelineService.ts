import PostgresDatabase from '../Infrastructure/PostgresDatabase';
import ScheduledMaintenanceStateTimeline from 'Model/Models/ScheduledMaintenanceStateTimeline';
import DatabaseService, { OnCreate, OnDelete } from './DatabaseService';
import BadDataException from 'Common/Types/Exception/BadDataException';
import ScheduledMaintenanceService from './ScheduledMaintenanceService';
import DeleteBy from '../Types/Database/DeleteBy';
import ObjectID from 'Common/Types/ObjectID';
import PositiveNumber from 'Common/Types/PositiveNumber';
import SortOrder from 'Common/Types/Database/SortOrder';

export class Service extends DatabaseService<ScheduledMaintenanceStateTimeline> {
    public constructor(postgresDatabase?: PostgresDatabase) {
        super(ScheduledMaintenanceStateTimeline, postgresDatabase);
    }

    protected override async onCreateSuccess(
        onCreate: OnCreate<ScheduledMaintenanceStateTimeline>,
        createdItem: ScheduledMaintenanceStateTimeline
    ): Promise<ScheduledMaintenanceStateTimeline> {
        if (!createdItem.scheduledMaintenanceId) {
            throw new BadDataException('scheduledMaintenanceId is null');
        }

        if (!createdItem.scheduledMaintenanceStateId) {
            throw new BadDataException('scheduledMaintenanceStateId is null');
        }

        await ScheduledMaintenanceService.updateBy({
            query: {
                _id: createdItem.scheduledMaintenanceId?.toString(),
            },
            data: {
                currentScheduledMaintenanceStateId:
                    createdItem.scheduledMaintenanceStateId,
            },
            props: onCreate.createBy.props,
        });

        return createdItem;
    }

    protected override async onBeforeDelete(
        deleteBy: DeleteBy<ScheduledMaintenanceStateTimeline>
    ): Promise<OnDelete<ScheduledMaintenanceStateTimeline>> {
        if (deleteBy.query._id) {
            const scheduledMaintenanceStateTimeline: ScheduledMaintenanceStateTimeline | null =
                await this.findOneById({
                    id: new ObjectID(deleteBy.query._id as string),
                    select: {
                        scheduledMaintenanceId: true,
                    },
                    props: {
                        isRoot: true,
                    },
                });

            const scheduledMaintenanceId: ObjectID | undefined =
                scheduledMaintenanceStateTimeline?.scheduledMaintenanceId;

            if (scheduledMaintenanceId) {
                const scheduledMaintenanceStateTimeline: PositiveNumber =
                    await this.countBy({
                        query: {
                            scheduledMaintenanceId: scheduledMaintenanceId,
                        },
                        props: {
                            isRoot: true,
                        },
                    });

                if (scheduledMaintenanceStateTimeline.isOne()) {
                    throw new BadDataException(
                        'Cannot delete the only state timeline. Scheduled Maintenance should have atleast one state in its timeline.'
                    );
                }
            }

            return { deleteBy, carryForward: scheduledMaintenanceId };
        }

        return { deleteBy, carryForward: null };
    }

    protected override async onDeleteSuccess(
        onDelete: OnDelete<ScheduledMaintenanceStateTimeline>,
        _itemIdsBeforeDelete: ObjectID[]
    ): Promise<OnDelete<ScheduledMaintenanceStateTimeline>> {
        if (onDelete.carryForward) {
            // this is scheduledMaintenanceId.
            const scheduledMaintenanceId: ObjectID =
                onDelete.carryForward as ObjectID;

            // get last status of this monitor.
            const scheduledMaintenanceStateTimeline: ScheduledMaintenanceStateTimeline | null =
                await this.findOneBy({
                    query: {
                        scheduledMaintenanceId: scheduledMaintenanceId,
                    },
                    sort: {
                        createdAt: SortOrder.Descending,
                    },
                    props: {
                        isRoot: true,
                    },
                    select: {
                        _id: true,
                        scheduledMaintenanceStateId: true,
                    },
                });

            if (
                scheduledMaintenanceStateTimeline &&
                scheduledMaintenanceStateTimeline.scheduledMaintenanceStateId
            ) {
                await ScheduledMaintenanceService.updateBy({
                    query: {
                        _id: scheduledMaintenanceId.toString(),
                    },
                    data: {
                        currentScheduledMaintenanceStateId:
                            scheduledMaintenanceStateTimeline.scheduledMaintenanceStateId,
                    },
                    props: {
                        isRoot: true,
                    },
                });
            }
        }

        return onDelete;
    }
}

export default new Service();