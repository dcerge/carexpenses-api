import { SendContact } from './SendContact';
import { NameValuePair } from './NameValuePair';
import { SendPersonalization } from './SendPersonalization';
import { SendMessage } from './SendMessage';

export interface MessageInput {
  contextId?: string;
  channelKey: string;
  lang?: string;
  selector?: string;
  templateId?: string;
  from?: SendContact;
  replyTo?: SendContact;
  to: SendContact[];
  bcc?: SendContact[];
  subject?: string;
  variables?: NameValuePair[];
  personalizations?: SendPersonalization[] | any;
  message?: SendMessage;
  category?: string[];
  customArguments?: NameValuePair[];
}
