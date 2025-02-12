import { NestFactory } from '@nestjs/core';

import {
  MessageQueueJob,
  MessageQueueJobData,
} from 'src/integrations/message-queue/interfaces/message-queue-job.interface';

import { JobsModule } from 'src/integrations/message-queue/jobs.module';
import { MessageQueue } from 'src/integrations/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/integrations/message-queue/services/message-queue.service';
import { getJobClassName } from 'src/integrations/message-queue/utils/get-job-class-name.util';
import { QueueWorkerModule } from 'src/queue-worker.module';

import { LoggerService } from './integrations/logger/logger.service';
import { ExceptionHandlerService } from './integrations/exception-handler/exception-handler.service';
import { filterException } from './engine/filters/utils/global-exception-handler.util';

async function bootstrap() {
  let exceptionHandlerService: ExceptionHandlerService | undefined;
  let loggerService: LoggerService | undefined;

  try {
    const app = await NestFactory.createApplicationContext(QueueWorkerModule, {
      bufferLogs: process.env.LOGGER_IS_BUFFER_ENABLED === 'true',
    });

    loggerService = app.get(LoggerService);
    exceptionHandlerService = app.get(ExceptionHandlerService);

    // Inject our logger
    app.useLogger(loggerService!);

    for (const queueName of Object.values(MessageQueue)) {
      const messageQueueService: MessageQueueService = app.get(queueName);

      await messageQueueService.work(async (jobData: MessageQueueJobData) => {
        const jobClassName = getJobClassName(jobData.name);
        const job: MessageQueueJob<MessageQueueJobData> = app
          .select(JobsModule)
          .get(jobClassName, { strict: true });

        try {
          await job.handle(jobData.data);
        } catch (err) {
          exceptionHandlerService?.captureExceptions([
            new Error(
              `Error occurred while processing job ${jobClassName} #${jobData.id}`,
            ),
            err,
          ]);
          throw err;
        }
      });
    }
  } catch (err) {
    loggerService?.error(err?.message, err?.name);

    if (!filterException(err)) {
      exceptionHandlerService?.captureExceptions([err]);
    }

    throw err;
  }
}
bootstrap();
