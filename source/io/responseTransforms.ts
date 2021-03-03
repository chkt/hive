import { State, Switch } from '@chkt/states/dist/state';
import { HttpResponseCode } from './http';
import { sendHtmlReply, sendTextReply } from './reply';
import { ControllerContext } from '../controller/controller';


export async function respondText(
	code:HttpResponseCode,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	sendTextReply(context.reply, code);

	return next.default(context);
}

export async function respondHtml(
	code:HttpResponseCode,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	sendHtmlReply(context.reply, code);

	return next.default(context);
}
