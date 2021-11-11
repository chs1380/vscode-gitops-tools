import { CommandId } from '../../commands';
import { FileTypes } from '../../fileTypes';
import { kubernetesTools } from '../../kubernetes/kubernetesTools';
import { Namespace } from '../../kubernetes/kubernetesTypes';
import { TreeNode } from './treeNode';

/**
 * Defines any kubernetes resourse.
 */
export class NamespaceNode extends TreeNode {

	/**
	 * kubernetes resource metadata
	 */
	resource: Namespace;

	constructor(namespace: Namespace) {
		super(namespace.metadata?.name || '');

		// save metadata reference
		this.resource = namespace;

		// set resource Uri to open resource config document in editor
		const resourceUri = kubernetesTools.getResourceUri(
			namespace.metadata?.namespace,
			`${namespace.kind}/${namespace.metadata?.name}`,
			FileTypes.Yaml,
		);

		// set open resource in editor command
		this.command = {
			command: CommandId.EditorOpenResource,
			arguments: [resourceUri],
			title: 'View Resource',
		};
	}
}