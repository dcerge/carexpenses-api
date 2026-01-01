// ./src/app/restapi/SignalRController.ts
import { BaseController } from '@sdflc/backend-helpers';

const root = '/api/signalr';
const core = 'signalrCore';

class SignalRController extends BaseController {
  init(props: any) {
    const { app } = props;

    // SignalR negotiation endpoint
    app.post(`${root}/negotiate`, this.json(this.negotiate));
  }

  async negotiate(req, res) {
    const result = await req.context.cores[core].negotiate({
      context: req.context,
    });
    return result;
  }
}

export { SignalRController };
