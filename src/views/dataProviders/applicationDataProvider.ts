import { ContextTypes, setContext } from '../../context';
import { kubernetesTools } from '../../kubernetes/kubernetesTools';
import { KubernetesObjectKinds } from '../../kubernetes/kubernetesTypes';
import { AnyResourceNode } from '../nodes/anyResourceNode';
import { ApplicationNode } from '../nodes/applicationNode';
import { HelmReleaseNode } from '../nodes/helmReleaseNode';
import { KustomizationNode } from '../nodes/kustomizationNode';
import { NamespaceNode } from '../nodes/namespaceNode';
import { TreeNode } from '../nodes/treeNode';
import { refreshApplicationTreeView } from '../treeViews';
import { DataProvider } from './dataProvider';

/**
 * Defines Applications data provider for loading Kustomizations
 * and Helm Releases in GitOps Applictions tree view.
 */
export class ApplicationDataProvider extends DataProvider {

	/**
   * Creates Application tree nodes for the currently selected kubernetes cluster.
   * @returns Application tree nodes to display.
   */
	async buildTree(): Promise<ApplicationNode[]> {
		const applicationNodes: ApplicationNode[] = [];

		setContext(ContextTypes.LoadingApplications, true);

		const [kustomizations, helmReleases] = await Promise.all([
			// Fetch all applications
			kubernetesTools.getKustomizations(),
			kubernetesTools.getHelmReleases(),
			// cache resource kinds
			kubernetesTools.getAvailableResourceKinds(),
		]);

		if (kustomizations) {
			for (const kustomizeApplication of kustomizations.items) {
				applicationNodes.push(new KustomizationNode(kustomizeApplication));
			}
		}

		if (helmReleases) {
			for (const helmRelease of helmReleases.items) {
				applicationNodes.push(new HelmReleaseNode(helmRelease));
			}
		}

		for (const node of applicationNodes) {
			this.updateApplicationChildren(node);
		}

		setContext(ContextTypes.LoadingApplications, false);
		setContext(ContextTypes.NoApplications, applicationNodes.length === 0);

		return applicationNodes;
	}

	/**
	 * Fetch all kubernetes resources that were created by a kustomize/helmRelease
	 * and add them as child nodes of the application.
	 * @param applicationNode target application node
	 */
	async updateApplicationChildren(applicationNode: ApplicationNode) {
		const name = applicationNode.resource.metadata.name || '';
		const namespace = applicationNode.resource.metadata.namespace || '';

		let applicationChildren;
		if (applicationNode instanceof KustomizationNode) {
			applicationChildren = await kubernetesTools.getChildrenOfApplication('kustomize', name, namespace);
		} else if (applicationNode instanceof HelmReleaseNode) {
			applicationChildren = await kubernetesTools.getChildrenOfApplication('helm', name, namespace);
		}

		if (!applicationChildren) {
			return;
		}

		// Get all namespaces
		const namespaces = await kubernetesTools.getNamespaces();
		if (!namespaces) {
			return;
		}

		const namespaceNodes = namespaces.items.map(namespace => new NamespaceNode(namespace));

		/*
		 * Do not delete empty namespace if it was in the fetched resources.
		 * Applications can create namespace kubernetes resources.
		 */
		const exceptNamespaces: string[] = [];

		// group children of application by namespace
		for (const namespaceNode of namespaceNodes) {
			for (const applicationChild of applicationChildren.items) {
				if (applicationChild.kind !== KubernetesObjectKinds.Namespace &&
					applicationChild.metadata?.namespace === namespaceNode.resource.metadata.name) {
					namespaceNode.addChild(new AnyResourceNode(applicationChild));
				} else {
					const namespaceName = namespaceNode.resource.metadata.name;
					if (namespaceName) {
						exceptNamespaces.push();
					}
				}
			}
		}

		// only show namespaces that are not empty
		applicationNode.children = namespaceNodes.filter(namespaceNode => !exceptNamespaces.some(exceptNamespace => exceptNamespace !== namespaceNode.resource.metadata.name) && namespaceNode.children.length);

		refreshApplicationTreeView(applicationNode);
	}

	/**
	 * This is called when the tree node is being expanded.
	 * @param applicationNode target node or undefined when at the root level.
	 */
	async getChildren(applicationNode?: KustomizationNode | HelmReleaseNode) {
		if (applicationNode) {
			if (applicationNode.children.length) {
				return applicationNode.children;
			} else {
				return [new TreeNode('Loading...')];
			}
		} else {
			return await this.buildTree();
		}
	}
}
