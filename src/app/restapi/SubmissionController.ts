// ./src/app/restapi/SubmissionController.ts
import { BaseController } from '@sdflc/backend-helpers';

const root = '/api/submissions';
const core = 'submissionCore';

class SubmissionController extends BaseController {
  init(props: any) {
    const { app } = props;

    // Register the route in the express app
    app.post(`${root}/:formId`, this.json(this.create));
  }

  async create(req, res) {
    const result = await req.context.cores[core].submit({});

    return result;
  }
}

export { SubmissionController };
