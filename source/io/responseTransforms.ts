import { State, Switch } from '@chkt/states/dist/state';
import { http_method, http_reply_code } from './http';
import { encodeListHeader } from './request';
import { sendTextReply } from './reply';
import { ControllerContext } from '../controller/controller';


export async function respondText(
	code:http_reply_code,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	sendTextReply(context.reply, code);

	return next.default(context);
}

export async function respondTextBadMethod(
	allowed:readonly http_method[],
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const reply = context.reply;

	reply.setHeader('Allow', encodeListHeader(allowed));

	sendTextReply(reply, http_reply_code.no_method);

	return next.success(context);
}
