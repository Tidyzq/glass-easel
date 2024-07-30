/* eslint-disable class-methods-use-this */
import type {
  BackendMode,
  Element,
  Event,
  EventBubbleStatus,
  EventOptions,
  ExternalShadowRoot,
  GeneralBehaviorBuilder,
  GeneralComponent,
  backend as GlassEaselBackend,
  Node,
  ShadowedEvent,
  StyleScopeManager,
  templateEngine,
} from 'glass-easel'
import { type Channel } from './message_channel'
import { type IDGenerator } from './utils'
import { replayShadowBackend } from './replay'

export const enum ShadowDomElementType {
  Fragment,
  Element,
  TextNode,
  Component,
  ShadowRoot,
  VirtualNode,
}

export class ShadowDomElement implements GlassEaselBackend.Element {
  public _id: number

  public __wxElement: Node | undefined
  public shadowRoot: ShadowDomShadowRoot | undefined

  /** @internal */
  static _prepareElement(
    context: ShadowDomBackendContext,
    elem: ShadowDomElement,
    logicalName: string,
    stylingName: string,
    ownerShadowRoot: ShadowDomShadowRoot,
  ): ShadowDomElement {
    context.channel.createElement(elem._id, logicalName, stylingName, ownerShadowRoot._id)
    return elem
  }

  static createElement(
    context: ShadowDomBackendContext,
    logicalName: string,
    stylingName: string,
    ownerShadowRoot: ShadowDomShadowRoot,
  ): ShadowDomElement {
    return ShadowDomElement._prepareElement(
      context,
      new ShadowDomElement(context, ShadowDomElementType.Element, ownerShadowRoot),
      logicalName,
      stylingName,
      ownerShadowRoot,
    )
  }

  /** @internal */
  static _prepareComponent(
    context: ShadowDomBackendContext,
    componentElement: ShadowDomElement,
    shadowRoot: ShadowDomShadowRoot,
    tagName: string,
    external: boolean,
    virtualHost: boolean,
    styleScope: number,
    extraStyleScope: number | null,
    externalClasses: string[] | undefined,
    ownerShadowRoot: ShadowDomShadowRoot,
  ): ShadowDomElement {
    context._checkStyleScope(styleScope)
    context._checkStyleScope(extraStyleScope)
    componentElement.shadowRoot = shadowRoot
    context.channel.createComponent(
      componentElement._id,
      shadowRoot._id,
      tagName,
      external,
      virtualHost,
      styleScope,
      extraStyleScope,
      externalClasses,
      ownerShadowRoot._id,
    )
    return componentElement
  }

  static createComponent(
    context: ShadowDomBackendContext,
    tagName: string,
    external: boolean,
    virtualHost: boolean,
    styleScope: number,
    extraStyleScope: number | null,
    externalClasses: string[] | undefined,
    ownerShadowRoot: ShadowDomShadowRoot,
  ): ShadowDomElement {
    return ShadowDomElement._prepareComponent(
      context,
      new ShadowDomElement(context, ShadowDomElementType.Component, ownerShadowRoot),
      new ShadowDomShadowRoot(context),
      tagName,
      external,
      virtualHost,
      styleScope,
      extraStyleScope,
      externalClasses,
      ownerShadowRoot,
    )
  }

  /** @internal */
  static _prepareTextNode(
    context: ShadowDomBackendContext,
    elem: ShadowDomElement,
    textContent: string,
    ownerShadowRoot: ShadowDomShadowRoot,
  ): ShadowDomElement {
    context.channel.createTextNode(elem._id, textContent, ownerShadowRoot._id)
    return elem
  }

  static createTextNode(
    context: ShadowDomBackendContext,
    textContent: string,
    ownerShadowRoot: ShadowDomShadowRoot,
  ): ShadowDomElement {
    return ShadowDomElement._prepareTextNode(
      context,
      new ShadowDomElement(context, ShadowDomElementType.TextNode, ownerShadowRoot),
      textContent,
      ownerShadowRoot,
    )
  }

  /** @internal */
  static _prepareVirtualNode(
    context: ShadowDomBackendContext,
    elem: ShadowDomElement,
    virtualName: string,
    ownerShadowRoot: ShadowDomShadowRoot,
  ): ShadowDomElement {
    context.channel.createVirtualNode(elem._id, virtualName, ownerShadowRoot._id)
    return elem
  }

  static createVirtualNode(
    context: ShadowDomBackendContext,
    virtualName: string,
    ownerShadowRoot: ShadowDomShadowRoot,
  ): ShadowDomElement {
    return ShadowDomElement._prepareVirtualNode(
      context,
      new ShadowDomElement(context, ShadowDomElementType.VirtualNode, ownerShadowRoot),
      virtualName,
      ownerShadowRoot,
    )
  }

  static createFragment(context: ShadowDomBackendContext): ShadowDomElement {
    const elem = new ShadowDomElement(context, ShadowDomElementType.Fragment, null)
    context.channel.createFragment(elem._id)
    return elem
  }

  protected constructor(
    protected _context: ShadowDomBackendContext,
    public type: ShadowDomElementType,
    public ownerShadowRoot: ShadowDomShadowRoot | null,
  ) {
    const id = (this._id = _context._genElementId())
    _context._setElementId(id, this)
  }

  release(): void {
    this._context._removeElementId(this._id)
    this._context.channel.release(this._id)
  }

  associateValue(v: Node): void {
    this.__wxElement = v
    this._context.channel.associateValue(this._id, this._context.getAssociateValueInfo(v))
  }

  getShadowRoot(): ShadowDomShadowRoot | undefined {
    return this.shadowRoot
  }

  appendChild(child: ShadowDomElement): void {
    this._context.channel.appendChild(this._id, child._id)
  }

  removeChild(child: ShadowDomElement): void {
    this._context.channel.removeChild(this._id, child._id)
  }

  insertBefore(child: ShadowDomElement, before: ShadowDomElement): void {
    this._context.channel.insertBefore(this._id, child._id, before._id)
  }

  replaceChild(child: ShadowDomElement, oldChild: ShadowDomElement): void {
    this._context.channel.replaceChild(this._id, child._id, oldChild._id)
  }

  spliceBefore(before: ShadowDomElement, deleteCount: number, list: ShadowDomElement): void {
    this._context.channel.spliceBefore(this._id, before._id, deleteCount, list._id)
  }

  spliceAppend(list: ShadowDomElement): void {
    this._context.channel.spliceAppend(this._id, list._id)
  }

  spliceRemove(start: ShadowDomElement, deleteCount: number): void {
    this._context.channel.spliceRemove(this._id, start._id, deleteCount)
  }

  setId(id: string): void {
    this._context.channel.setId(this._id, id)
  }

  setSlotName(name: string): void {
    this._context.channel.setSlotName(this._id, name)
  }

  setContainingSlot(slot: ShadowDomElement | undefined | null): void {
    this._context.channel.setContainingSlot(this._id, slot ? slot._id : slot)
  }

  reassignContainingSlot(oldSlot: ShadowDomElement | null, newSlot: ShadowDomElement | null): void {
    this._context.channel.reassignContainingSlot(
      this._id,
      oldSlot ? oldSlot._id : oldSlot,
      newSlot ? newSlot._id : newSlot,
    )
  }

  spliceBeforeSlotNodes(before: number, deleteCount: number, list: ShadowDomElement): void {
    this._context.channel.spliceBeforeSlotNodes(this._id, before, deleteCount, list._id)
  }

  spliceAppendSlotNodes(list: ShadowDomElement): void {
    this._context.channel.spliceAppendSlotNodes(this._id, list._id)
  }

  spliceRemoveSlotNodes(before: number, deleteCount: number): void {
    this._context.channel.spliceRemoveSlotNodes(this._id, before, deleteCount)
  }

  setInheritSlots(): void {
    this._context.channel.setInheritSlots(this._id)
  }

  setStyle(_styleText: string): void {
    this._context.channel.setStyle(this._id, _styleText)
  }

  addClass(className: string): void {
    this._context.channel.addClass(this._id, className)
  }

  removeClass(className: string): void {
    this._context.channel.removeClass(this._id, className)
  }

  clearClasses(): void {
    this._context.channel.clearClasses(this._id)
  }

  setClassAlias(className: string, target: string[]): void {
    this._context.channel.setClassAlias(this._id, className, target)
  }

  setAttribute(name: string, value: any): void {
    this._context.channel.setAttribute(this._id, name, value)
  }

  removeAttribute(name: string): void {
    this._context.channel.removeAttribute(this._id, name)
  }

  setDataset(name: string, value: unknown): void {
    this._context.channel.setDataset(this._id, name, value)
  }

  setText(content: string): void {
    this._context.channel.setText(this._id, content)
  }

  getBoundingClientRect(
    cb: (res: { left: number; top: number; width: number; height: number }) => void,
  ): void {
    this._context.channel.getBoundingClientRect(this._id, cb)
  }

  getScrollOffset(
    cb: (res: {
      scrollLeft: number
      scrollTop: number
      scrollWidth: number
      scrollHeight: number
    }) => void,
  ): void {
    this._context.channel.getScrollOffset(this._id, cb)
  }

  setModelBindingStat(attributeName: string, listener: ((newValue: unknown) => void) | null): void {
    this._context.channel.setModelBindingStat(this._id, attributeName, listener)
  }

  setListenerStats(type: string, capture: boolean, mutLevel: number): void {
    this._context.channel.setListenerStats(this._id, type, capture, mutLevel)
  }

  createIntersectionObserver(
    relativeElement: ShadowDomElement | null,
    relativeElementMargin: string,
    thresholds: number[],
    listener: (res: GlassEaselBackend.IntersectionStatus) => void,
  ): GlassEaselBackend.Observer {
    const id = this._context.channel.createIntersectionObserver(
      this._id,
      relativeElement ? relativeElement._id : null,
      relativeElementMargin,
      thresholds,
      listener,
    )
    return {
      disconnect: () => {
        this._context.channel.disconnectObserver(id)
      },
    }
  }

  getContext(cb: (res: any) => void): void {
    this._context.channel.getContext(this._id, cb)
  }
}

export class ShadowDomShadowRoot
  extends ShadowDomElement
  implements GlassEaselBackend.ShadowRootContext
{
  /** @internal */
  constructor(context: ShadowDomBackendContext) {
    super(context, ShadowDomElementType.ShadowRoot, null)
    this.ownerShadowRoot = this
  }

  createElement(logicalName: string, stylingName: string): ShadowDomElement {
    return ShadowDomElement.createElement(this._context, logicalName, stylingName, this)
  }
  createTextNode(content: string): ShadowDomElement {
    return ShadowDomElement.createTextNode(this._context, content, this)
  }
  createComponent(
    tagName: string,
    external: boolean,
    virtualHost: boolean,
    styleScope: number,
    extraStyleScope: number | null,
    externalClasses: string[] | undefined,
  ): ShadowDomElement {
    return ShadowDomElement.createComponent(
      this._context,
      tagName,
      external,
      virtualHost,
      styleScope,
      extraStyleScope,
      externalClasses,
      this,
    )
  }
  createVirtualNode(virtualName: string): ShadowDomElement {
    return ShadowDomElement.createVirtualNode(this._context, virtualName, this)
  }
}

export class ShadowDomBackendContext implements GlassEaselBackend.Context {
  mode: BackendMode.Shadow = 1

  private _elementIdGen: IDGenerator
  private _elementIdMap: (ShadowDomElement | undefined)[] = []

  private _shadowRoot: ShadowDomShadowRoot

  private _$registeredStyleSheets = [] as [string, unknown][]
  private _$appendedStyleSheets = [] as [number, string, number | undefined][]
  private _$styleSheetIdInc = 1
  private _$styleScopeMap = new Map<number, string | undefined>()
  private _windowInfo = {
    width: 0,
    height: 0,
    devicePixelRatio: 0,
  }
  private _themeInfo = {
    theme: 'light',
  }
  private _windowResizeListener:
    | ((res: { width: number; height: number; devicePixelRatio: number }) => void)
    | undefined
  private _themeChangeListener: ((res: { theme: string }) => void) | undefined
  private _createEvent:
    | ((type: string, detail: any, options: EventOptions) => Event<unknown>)
    | null = null
  private _triggerEvent:
    | ((
        event: Event<unknown>,
        currentTarget: Element,
        mark: Record<string, unknown> | null,
        target: Element,
        isCapture: boolean,
      ) => EventBubbleStatus | void)
    | null = null

  private _traceIdGen: IDGenerator

  constructor(
    public channel: Channel,
    private styleScopeManager: StyleScopeManager,
    idGenerator: () => IDGenerator,
  ) {
    this._elementIdGen = idGenerator()
    this._traceIdGen = idGenerator()
    this._shadowRoot = new ShadowDomShadowRoot(this)
    this.initContext()
  }

  initContext() {
    const { channel } = this
    channel.create(({ windowInfo, themeInfo }) => {
      this._windowInfo = windowInfo
      this._themeInfo = themeInfo
    })
    channel.onEvent(
      (type, detail, options) => this._createEvent!(type, detail, options),
      (event, currentTargetId, mark, targetId, isCapture) => {
        const currentTarget = this._elementIdMap[currentTargetId]!.__wxElement as Element
        const target = this._elementIdMap[targetId]!.__wxElement as Element

        this._triggerEvent!(event, currentTarget, mark, target, isCapture)
      },
    )
    channel.onWindowResize((windowInfo) => {
      this._windowInfo = windowInfo
      this._windowResizeListener?.(windowInfo)
    })
    channel.onThemeChange((themeInfo) => {
      this._themeInfo = themeInfo
      this._themeChangeListener?.(themeInfo)
    })
  }

  getAssociateValueInfo(_node: Node): Record<string, unknown> {
    return {}
  }

  destroy(): void {
    this.channel.destroy()
  }

  getWindowWidth(): number {
    return this._windowInfo.width
  }

  getWindowHeight(): number {
    return this._windowInfo.height
  }

  getDevicePixelRatio(): number {
    return this._windowInfo.devicePixelRatio
  }

  onWindowResize(
    cb: (res: { width: number; height: number; devicePixelRatio: number }) => void,
  ): void {
    this._windowResizeListener = cb
  }

  getTheme(): string {
    return this._themeInfo.theme
  }

  onThemeChange(cb: (res: { theme: string }) => void): void {
    this._themeChangeListener = cb
  }

  registerStyleSheetContent(path: string, content: any): void {
    this._$registeredStyleSheets.push([path, content])
    this.channel.registerStyleSheetContent(path, content)
  }

  _checkStyleScope(styleScope: number | null | undefined) {
    if (styleScope !== null && styleScope !== undefined && !this._$styleScopeMap.has(styleScope)) {
      const stylePrefix = this.styleScopeManager.queryName(styleScope)
      this._$styleScopeMap.set(styleScope, stylePrefix)
      this.channel.registerStyleScope(styleScope, stylePrefix)
    }
  }

  appendStyleSheetPath(path: string, styleScope: number | undefined): number {
    this._checkStyleScope(styleScope)
    const id = this._$styleSheetIdInc
    this._$styleSheetIdInc += 1
    this._$appendedStyleSheets.push([id, path, styleScope])
    this.channel.appendStyleSheetPath(id, path, styleScope)
    return id
  }

  disableStyleSheet(index: number): void {
    this.channel.disableStyleSheet(index)
  }

  render(cb: (err: Error | null) => void) {
    this.channel.render(cb)
  }

  getRootNode(): ShadowDomShadowRoot {
    return this._shadowRoot
  }

  createFragment(): ShadowDomElement {
    return ShadowDomElement.createFragment(this)
  }

  onEvent(
    _createEvent: (type: string, detail: any, options: EventOptions) => Event<unknown>,
    _listener: (
      event: Event<unknown>,
      currentTarget: Element,
      mark: Record<string, unknown> | null,
      target: Element,
      isCapture: boolean,
    ) => EventBubbleStatus | void,
  ): void {
    this._createEvent = _createEvent
    this._triggerEvent = _listener
  }

  createMediaQueryObserver(
    status: GlassEaselBackend.MediaQueryStatus,
    listener: (res: { matches: boolean }) => void,
  ): GlassEaselBackend.Observer {
    const id = this.channel.createMediaQueryObserver(status, listener)
    return {
      disconnect: () => {
        this.channel.disconnectObserver(id)
      },
    }
  }

  _genElementId() {
    return this._elementIdGen.gen()
  }

  _setElementId(id: number, elem: ShadowDomElement) {
    this._elementIdMap[id] = elem
  }

  _getElementId(id: number) {
    return this._elementIdMap[id]
  }

  _removeElementId(id: number) {
    this._elementIdGen.release(id)
    this._elementIdMap[id] = undefined
  }

  performanceTraceStart(): number {
    const id = this._traceIdGen.gen()
    this.channel.performanceStartTrace(id)
    return id
  }

  performanceTraceEnd(
    id: number,
    cb: (stats: { startTimestamp: number; endTimestamp: number }) => void,
  ): void {
    this._traceIdGen.release(id)
    this.channel.performanceEndTrace(id, cb)
  }

  reInitContext() {
    this.initContext()
    this._$registeredStyleSheets.forEach(([path, content]) => {
      this.channel.registerStyleSheetContent(path, content)
    })
    this._$styleScopeMap.forEach((stylePrefix, styleScope) => {
      this.channel.registerStyleScope(styleScope, stylePrefix)
    })
    this._$appendedStyleSheets.forEach(([id, path, styleScope]) => {
      this.channel.appendStyleSheetPath(id, path, styleScope)
    })
  }

  replay(
    glassEasel: typeof import('glass-easel'),
    roots: Node[],
    getShadowDomElement: (elem: Node) => ShadowDomElement,
  ) {
    roots.forEach((root) => {
      replayShadowBackend(glassEasel, this, root, {
        createElement: (ownerShadowRoot: ShadowDomShadowRoot, elem) => {
          let be
          if (glassEasel.TextNode.isTextNode(elem)) {
            be = ShadowDomElement._prepareTextNode(
              this,
              getShadowDomElement(elem),
              elem.textContent,
              ownerShadowRoot,
            )
          } else if (glassEasel.NativeNode.isNativeNode(elem)) {
            be = ShadowDomElement._prepareElement(
              this,
              getShadowDomElement(elem),
              elem.is,
              elem.stylingName,
              ownerShadowRoot,
            )
          } else if (glassEasel.VirtualNode.isVirtualNode(elem)) {
            // shadowRoot is created by createComponent, ignore it
            be = ShadowDomElement._prepareVirtualNode(
              this,
              getShadowDomElement(elem),
              elem.is,
              ownerShadowRoot,
            )
          } else if (glassEasel.Component.isComponent(elem)) {
            const options = elem.getComponentOptions()
            be = ShadowDomElement._prepareComponent(
              this,
              getShadowDomElement(elem),
              getShadowDomElement(elem.getShadowRoot()!) as ShadowDomShadowRoot,
              elem.tagName,
              elem.isExternal(),
              elem.isVirtual(),
              options.styleScope ?? glassEasel.StyleScopeManager.globalScope(),
              options.extraStyleScope,
              elem.getExternalClassNames(),
              ownerShadowRoot,
            )
          } else {
            throw new Error(`Unknown elem type ${elem.constructor.name}`)
          }
          return be
        },
      })
      this._shadowRoot.appendChild(getShadowDomElement(root))
    })
  }
}

class SyncExternalShadowRoot implements ExternalShadowRoot {
  public root: ShadowDomElement
  public slot: ShadowDomElement

  constructor(_root: ShadowDomElement, _slot: ShadowDomElement) {
    this.root = _root
    this.slot = _slot
  }

  getIdMap() {
    return {}
  }
  handleEvent<T>(target: ShadowDomElement, event: Event<T>): void {
    // TODO
  }
  setListener<T>(
    elem: ShadowDomElement,
    ev: string,
    listener: (event: ShadowedEvent<T>) => unknown,
  ): void {
    // TODO
  }
}

export class SyncTemplateEngine implements templateEngine.Template {
  static create() {
    return new SyncTemplateEngine()
  }

  createInstance(elem: GeneralComponent): templateEngine.TemplateInstance {
    const context = elem.getBackendContext()
    if (!(context instanceof ShadowDomBackendContext)) {
      throw new Error('')
    }
    const { channel } = context
    const backendElement = elem.getBackendElement() as ShadowDomElement

    const shadowRoot = new SyncExternalShadowRoot(backendElement, backendElement)

    const instance: templateEngine.TemplateInstance = {
      shadowRoot,
      initValues: (data) => {
        channel.initValues(backendElement._id, data)
      },
      updateValues: (data, changes) => {
        channel.updateValues(backendElement._id, changes)
      },
    }

    return instance
  }
}

export const SyncBehavior = <TBehaviorBuilder extends GeneralBehaviorBuilder>(
  builder: TBehaviorBuilder,
  properties: string[],
  getContextFromMethodCaller: (methodCaller: unknown) => {
    context: ShadowDomBackendContext
    backendElement: ShadowDomElement
  },
): TBehaviorBuilder => {
  builder.lifetime('created', function () {
    const { context, backendElement } = getContextFromMethodCaller(this)
    context.channel.initValues(
      backendElement._id,
      properties.reduce((initValues, property) => {
        initValues[property] = this.data[property]
        return initValues
      }, {} as Record<string, unknown>),
    )
  })
  properties.forEach((property) => {
    builder.observer(property, function (newValue) {
      const { context, backendElement } = getContextFromMethodCaller(this)
      context.channel.updateValues(backendElement._id, [
        [[property], newValue, undefined, undefined],
      ])
    })
  })
  return builder
}

export const getNodeId = (node: Node) =>
  (node.getBackendElement() as unknown as ShadowDomElement)._id

export { Channel, ChannelEventType, MessageChannelDataSide } from './message_channel'
export { getLinearIdGenerator, getRandomIdGenerator } from './utils'
export { replayShadowBackend, ReplayHandler } from './replay'