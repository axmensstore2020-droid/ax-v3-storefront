import ShopifyInfoPage from '../../components/ShopifyInfoPage';
import {StylistButton} from '../../components/StylistProvider';
import Icon from '../../components/Icon';
export const metadata={title:'How AX Stylist works'};
export default function StylistInfoPage() {return <ShopifyInfoPage kind="stylist" eyebrow="AX STYLIST"><StylistButton className="underlined-link">EXPLORE WITH AX <Icon name="arrow"/></StylistButton></ShopifyInfoPage>;}
