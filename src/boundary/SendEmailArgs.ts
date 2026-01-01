import { MessageInput } from './MessageInput';

export interface SendEmailArgs {
  params: MessageInput;
  jwtToken?: string;
  spaceId?: string;
}
