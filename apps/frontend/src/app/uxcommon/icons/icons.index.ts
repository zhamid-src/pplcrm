import userPlus from '../../../assets/icons/user-plus.svg?raw';
import userCircle from '../../../assets/icons/user-circle.svg?raw';
import userGroup from '../../../assets/icons/user-group.svg?raw';
import users from '../../../assets/icons/users.svg?raw';
import arrowDownTray from '../../../assets/icons/arrow-down-tray.svg?raw';
import arrowLeftStartOnRectangle from '../../../assets/icons/arrow-left-start-on-rectangle.svg?raw';
import arrowPath from '../../../assets/icons/arrow-path.svg?raw';
import arrowRightEndOnRectangle from '../../../assets/icons/arrow-right-end-on-rectangle.svg?raw';
import arrowRightStartOnRectangle from '../../../assets/icons/arrow-right-start-on-rectangle.svg?raw';
import arrowTopRightOnSquare from '../../../assets/icons/arrow-top-right-on-square.svg?raw';
import arrowUpTray from '../../../assets/icons/arrow-up-tray.svg?raw';
import arrowUturnLeft from '../../../assets/icons/arrow-uturn-left.svg?raw';
import arrowUturnRight from '../../../assets/icons/arrow-uturn-right.svg?raw';
import chevronDoubleLeft from '../../../assets/icons/chevron-double-left.svg?raw';
import chevronDoubleRight from '../../../assets/icons/chevron-double-right.svg?raw';
import checkCircle from '../../../assets/icons/check-circle.svg?raw';
import exclamationCircle from '../../../assets/icons/exclamation-circle.svg?raw';
import exclamationTriangle from '../../../assets/icons/exclamation-triangle.svg?raw';
import informationCircle from '../../../assets/icons/information-circle.svg?raw';
import xCircle from '../../../assets/icons/x-circle.svg?raw';
import xMark from '../../../assets/icons/x-mark.svg?raw';
import bars3 from '../../../assets/icons/bars-3.svg?raw';
import bars4 from '../../../assets/icons/bars-4.svg?raw';
import bell from '../../../assets/icons/bell.svg?raw';
import clipboardDocumentList from '../../../assets/icons/clipboard-document-list.svg?raw';
import cog6Tooth from '../../../assets/icons/cog-6-tooth.svg?raw';
import ellipsisVertical from '../../../assets/icons/ellipsis-vertical.svg?raw';
import filter from '../../../assets/icons/filter.svg?raw';
import funnel from '../../../assets/icons/funnel.svg?raw';
import magnifyingGlass from '../../../assets/icons/magnifying-glass.svg?raw';
import pencilSquare from '../../../assets/icons/pencil-square.svg?raw';
import plus from '../../../assets/icons/plus.svg?raw';
import queueList from '../../../assets/icons/queue-list.svg?raw';
import tag from '../../../assets/icons/tag.svg?raw';
import trash from '../../../assets/icons/trash.svg?raw';
import banknotes from '../../../assets/icons/banknotes.svg?raw';
import briefcase from '../../../assets/icons/briefcase.svg?raw';
import creditCard from '../../../assets/icons/credit-card.svg?raw';
import currencyDollar from '../../../assets/icons/currency-dollar.svg?raw';
import atSymbol from '../../../assets/icons/at-symbol.svg?raw';
import envelope from '../../../assets/icons/envelope.svg?raw';
import megaphone from '../../../assets/icons/megaphone.svg?raw';
import paperAirplane from '../../../assets/icons/paper-airplane.svg?raw';
import clock from '../../../assets/icons/clock.svg?raw';
import home from '../../../assets/icons/home.svg?raw';
import houseModern from '../../../assets/icons/house-modern.svg?raw';
import map from '../../../assets/icons/map.svg?raw';
import mapPin from '../../../assets/icons/map-pin.svg?raw';
import cloudArrowUp from '../../../assets/icons/cloud-arrow-up.svg?raw';
import lockClosed from '../../../assets/icons/lock-closed.svg?raw';
import presentationChartLine from '../../../assets/icons/presentation-chart-line.svg?raw';
import chartPie from '../../../assets/icons/chart-pie.svg?raw';
import globeAmericas from '../../../assets/icons/globe-americas.svg?raw';
import hashtag from '../../../assets/icons/hashtag.svg?raw';
import identification from '../../../assets/icons/identification.svg?raw';
import rectangleStack from '../../../assets/icons/rectangle-stack.svg?raw';
import square3Stack3d from '../../../assets/icons/square-3-stack-3d.svg?raw';
import sun from '../../../assets/icons/sun.svg?raw';
import moon from '../../../assets/icons/moon.svg?raw';
import eye from '../../../assets/icons/eye.svg?raw';
import eyeSlash from '../../../assets/icons/eye-slash.svg?raw';

export const icons = {
  'user-plus': userPlus,
  'user-circle': userCircle,
  'user-group': userGroup,
  users: users,
  'arrow-down-tray': arrowDownTray,
  'arrow-left-start-on-rectangle': arrowLeftStartOnRectangle,
  'arrow-path': arrowPath,
  'arrow-right-end-on-rectangle': arrowRightEndOnRectangle,
  'arrow-right-start-on-rectangle': arrowRightStartOnRectangle,
  'arrow-top-right-on-square': arrowTopRightOnSquare,
  'arrow-up-tray': arrowUpTray,
  'arrow-uturn-left': arrowUturnLeft,
  'arrow-uturn-right': arrowUturnRight,
  'chevron-double-left': chevronDoubleLeft,
  'chevron-double-right': chevronDoubleRight,
  'check-circle': checkCircle,
  'exclamation-circle': exclamationCircle,
  'exclamation-triangle': exclamationTriangle,
  'information-circle': informationCircle,
  'x-circle': xCircle,
  'x-mark': xMark,
  'bars-3': bars3,
  'bars-4': bars4,
  bell: bell,
  'clipboard-document-list': clipboardDocumentList,
  'cog-6-tooth': cog6Tooth,
  'ellipsis-vertical': ellipsisVertical,
  filter: filter,
  funnel: funnel,
  'magnifying-glass': magnifyingGlass,
  'pencil-square': pencilSquare,
  plus: plus,
  'queue-list': queueList,
  tag: tag,
  trash: trash,
  banknotes: banknotes,
  briefcase: briefcase,
  'credit-card': creditCard,
  'currency-dollar': currencyDollar,
  'at-symbol': atSymbol,
  envelope: envelope,
  megaphone: megaphone,
  'paper-airplane': paperAirplane,
  clock: clock,
  home: home,
  'house-modern': houseModern,
  map: map,
  'map-pin': mapPin,
  'cloud-arrow-up': cloudArrowUp,
  'lock-closed': lockClosed,
  'presentation-chart-line': presentationChartLine,
  'chart-pie': chartPie,
  'globe-americas': globeAmericas,
  hashtag: hashtag,
  identification: identification,
  'rectangle-stack': rectangleStack,
  'square-3-stack-3d': square3Stack3d,
  sun: sun,
  moon: moon,
  eye: eye,
  'eye-slash': eyeSlash,
} as const;

export type IconName = keyof typeof icons;
