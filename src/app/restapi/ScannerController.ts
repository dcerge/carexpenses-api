// ./src/app/restapi/SubmissionController.ts
import { BaseController } from '@sdflc/backend-helpers';

const root = '/api/scanner';
const core = 'scannerCore';

class ScannerController extends BaseController {
  init(props: any) {
    const { app } = props;

    // Register the route in the express app
    app.post(`${root}/scan-receipt`, this.json(this.scanReceipt));
  }

  async scanReceipt(req, res) {
    const result = await req.context.cores[core].scanReceipt({});
    return result;
  }
}

export { ScannerController };
